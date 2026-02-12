import { useEffect, useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
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
    CloudArrowUp, 
    Info, 
    FolderPlus, 
    Database, 
    Sparkle,
    CaretRight
} from "@phosphor-icons/react";
import { WhistlerLogo } from "@/components/ui/WhistlerLogo";
import { importProject, type ProjectExportData } from "@/utils/projectData";
import type { AccentTheme } from "@/types";

const SYNC_API_URL = "https://whistler-sync.peteawesome.workers.dev";
const TURNSTILE_SITE_KEY = "0x4AAAAAACL9Ojn2jXAFNaw_";

const ACCENT_OPTIONS: { id: AccentTheme; label: string; color: string }[] = [
    { id: "orange", label: "Orange", color: "#f97316" },
    { id: "emerald", label: "Emerald", color: "#10b981" },
    { id: "violet", label: "Violet", color: "#8b5cf6" },
    { id: "sky", label: "Sky", color: "#0ea5e9" },
];

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
    const { addProject, setActiveProject, login, setLastSyncTime, setState, accentTheme, setAccentTheme } = useStore(useShallow((state: AppStore) => ({
        addProject: state.addProject,
        setActiveProject: state.setActiveProject,
        login: state.login,
        setLastSyncTime: state.setLastSyncTime,
        setState: state.setState,
        accentTheme: state.accentTheme,
        setAccentTheme: state.setAccentTheme,
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
        const name = newProjectName.trim();
        if (!name) return;
        
        const project = addProject(name);
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
        <div className="min-h-screen xl:h-screen bg-background text-foreground font-mono flex flex-col border-x-[4px] md:border-x-[8px] border-b-[4px] md:border-b-[8px] border-black overflow-x-hidden xl:overflow-hidden select-none">
            <header className="flex flex-row justify-between items-center p-2 md:p-4 xl:p-5 relative z-20">
                <div className="flex items-center gap-3 xl:gap-5">
                    <WhistlerLogo className="w-12 h-12 md:w-16 md:h-16 xl:w-20 xl:h-20" />
                    <div className="flex flex-col">
                        <h1 className="text-[6vw] md:text-4xl xl:text-5xl font-black uppercase leading-[0.8] tracking-tighter">Whistlerbox</h1>
                        <p className="text-[2vw] md:text-xs xl:text-sm font-bold uppercase tracking-[0.2em] opacity-60">Creative Project Management</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 xl:gap-6">
                    {/* Sync Access Card */}
                    <div 
                            onClick={() => setSignInOpen(true)}
                            className="group/sync cursor-pointer bg-white text-black border-[3px] md:border-[4px] border-black p-1.5 md:p-2 flex items-center gap-2 md:gap-3 hover:bg-primary hover:text-primary-foreground transition-all relative overflow-hidden shadow-[-4px_4px_0px_0px_rgba(var(--primary-rgb),0.5)] hover:shadow-none hover:-translate-x-[4px] hover:translate-y-[4px] max-w-xs xl:max-w-sm self-start md:self-center"
                        >
                            {/* Thick themed outline on edges */}
                            <div className="absolute -inset-[2px] border-[4px] border-primary pointer-events-none transition-all duration-300 opacity-0 group-hover/sync:opacity-100 group-hover/sync:inset-0 z-10"></div>
                            
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none group-hover/sync:opacity-0 transition-opacity"></div>
                        <div className="bg-white text-black p-1 md:p-1.5 border-2 border-black group-hover/sync:bg-black group-hover/sync:text-white group-hover/sync:border-primary transition-colors shrink-0 flex items-center justify-center">
                            <CloudArrowUp weight="bold" className="size-4 md:size-6 xl:size-7 group-hover/sync:animate-bounce group-hover/sync:translate-y-1 transition-transform" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h3 className="text-sm md:text-lg xl:text-xl font-black uppercase leading-none group-hover/sync:text-inherit transition-colors truncate">Sync Access</h3>
                            <p className="text-[7px] md:text-[9px] xl:text-xs font-bold uppercase italic opacity-60 group-hover/sync:opacity-100 transition-opacity leading-tight">Remote access</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow grid grid-cols-1 xl:grid-cols-12 min-h-0">
                {/* Primary Action Card */}
                <section className="xl:col-span-7 bg-background xl:border-r-[8px] md:border-r-[12px] border-black p-3 md:p-5 xl:p-6 flex flex-col justify-center xl:justify-between group hover:bg-primary/5 transition-colors relative overflow-hidden min-h-[300px] xl:min-h-0 shrink-0 xl:shrink">
                    {/* Thick themed outline on edges */}
                    <div className="absolute -inset-[4px] border-[6px] border-primary pointer-events-none transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:inset-0 z-10"></div>
                    
                    {/* Themed shading/gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 group-hover:from-primary/20 transition-all duration-500 pointer-events-none"></div>
                    
                    {/* Abstract Shapes for "Colorfulness" */}
                    <div className="absolute top-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
                    
                    <div className="absolute top-[-5%] right-[-5%] opacity-[0.05] group-hover:opacity-[0.15] group-hover:scale-110 transition-all duration-700 pointer-events-none text-primary">
                        <FolderPlus weight="fill" className="size-[200px] md:size-[500px] -rotate-12" />
                    </div>
                    
                    <div className="relative z-10 flex-shrink mb-4 xl:mb-0">
                        <div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-4">
                            <div className="bg-black text-white p-2 md:p-3 border-2 border-primary group-hover:bg-primary group-hover:text-black transition-colors">
                                <Plus weight="bold" className="size-6 md:size-10" />
                            </div>
                            <h2 className="text-[8vw] md:text-5xl xl:text-7xl font-black uppercase leading-none tracking-tight group-hover:text-primary transition-colors">
                                Start Fresh
                            </h2>
                        </div>
                        <p className="text-[4vw] md:text-xl xl:text-3xl leading-tight mb-3 md:mb-6 font-bold max-w-2xl opacity-90 group-hover:opacity-100 transition-opacity">
                            Create a new project and start organizing your files, highlights, and thoughts in a brutalist environment.
                        </p>
                    </div>

                    <Button 
                        onClick={handleNewProject}
                        className="w-full xl:w-fit bg-white text-black hover:bg-primary hover:text-primary-foreground border-[4px] md:border-[6px] border-black text-lg md:text-2xl xl:text-4xl py-4 md:py-8 xl:py-10 px-6 md:px-16 xl:px-20 rounded-none font-black uppercase shadow-[6px_-6px_0px_0px_rgba(var(--primary-rgb),0.5)] hover:shadow-none hover:translate-x-[6px] hover:-translate-y-[6px] active:translate-x-[6px] active:-translate-y-[6px] active:shadow-none transition-all flex items-center justify-center xl:justify-start gap-3 md:gap-6 group/btn"
                    >
                        Create Project <CaretRight weight="bold" className="size-6 md:size-10 group-hover/btn:translate-x-2 transition-transform" />
                    </Button>
                </section>

                {/* Secondary Action Cards */}
                <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 xl:grid-rows-2 min-h-0 shrink-0 xl:shrink">
                    <section className="bg-background sm:border-r-[4px] xl:border-r-0 border-black p-2 md:p-3 xl:p-4 flex flex-col justify-between group hover:bg-primary/5 transition-colors relative overflow-hidden min-h-[250px] xl:min-h-0">
                        {/* Thick themed outline on edges */}
                        <div className="absolute -inset-[4px] border-[6px] border-primary pointer-events-none transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:inset-0 z-10"></div>
                        
                        {/* Themed shading */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-transparent group-hover:from-primary/30 transition-all duration-500 pointer-events-none"></div>
                        
                        <div className="absolute bottom-[-10%] right-[-5%] opacity-[0.08] group-hover:opacity-[0.2] group-hover:scale-110 transition-all duration-700 pointer-events-none text-primary">
                            <Database weight="fill" className="size-[120px] md:size-[300px]" />
                        </div>

                        <div className="relative z-10 flex-shrink">
                            <h2 className="text-[6vw] md:text-3xl xl:text-4xl font-black uppercase mb-1 md:mb-2 bg-black text-white inline-block px-2 py-1 border-l-4 border-primary group-hover:bg-primary group-hover:text-black transition-colors">
                                Import
                            </h2>
                            <p className="text-[3.5vw] md:text-lg xl:text-xl leading-tight mb-2 md:mb-3 font-bold max-w-md group-hover:text-primary transition-colors">
                                Have an existing project? Import your JSON project here.
                            </p>
                        </div>

                        <Button 
                            onClick={handleImportProject}
                            className="w-full xl:w-fit bg-white text-black hover:bg-primary hover:text-primary-foreground border-[4px] border-black text-lg md:text-xl xl:text-2xl py-3 md:py-6 xl:py-8 px-6 md:px-10 xl:px-12 rounded-none font-black uppercase shadow-[-4px_4px_0px_0px_rgba(var(--primary-rgb),0.5)] hover:shadow-none hover:-translate-x-[4px] hover:translate-y-[4px] active:-translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center xl:justify-start gap-3 md:gap-4 relative z-10 group/import"
                        >
                            <DownloadSimple weight="bold" className="size-5 md:size-8 group-hover/import:scale-110 transition-transform" /> Import Project
                        </Button>
                    </section>

                    <section className="bg-background p-2 md:p-3 xl:p-4 flex flex-col justify-between group hover:bg-primary/5 transition-colors relative overflow-hidden min-h-[250px] xl:min-h-0">
                        {/* Thick themed outline on edges */}
                        <div className="absolute -inset-[4px] border-[6px] border-primary pointer-events-none transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:inset-0 z-10"></div>
                        
                        {/* Themed shading */}
                        <div className="absolute inset-0 bg-gradient-to-bl from-primary/10 via-transparent to-transparent group-hover:from-primary/20 transition-all duration-500 pointer-events-none"></div>
                        
                        <div className="absolute top-[-10%] left-[-5%] opacity-[0.08] group-hover:opacity-[0.2] group-hover:scale-110 transition-all duration-700 pointer-events-none text-primary">
                            <Sparkle weight="fill" className="size-[120px] md:size-[300px] rotate-12" />
                        </div>

                        <div className="relative z-10 flex flex-col items-end text-right flex-shrink">
                            <h2 className="text-[6vw] md:text-3xl xl:text-4xl font-black uppercase mb-1 md:mb-2 bg-black text-white inline-block px-2 py-1 border-r-4 border-primary group-hover:bg-primary group-hover:text-black transition-colors">
                                Quick Start
                            </h2>
                            <p className="text-[3.5vw] md:text-lg xl:text-xl leading-tight mb-2 md:mb-3 font-bold max-w-md group-hover:text-primary transition-colors">
                                Not ready to commit? Load a demo project to explore the features.
                            </p>
                        </div>

                        <div className="flex justify-end relative z-10">
                            <Button 
                                onClick={handleLoadDemo}
                                className="w-full xl:w-fit bg-white text-black hover:bg-primary hover:text-primary-foreground border-[4px] border-black text-lg md:text-xl xl:text-2xl py-3 md:py-6 xl:py-8 px-6 md:px-10 xl:px-12 rounded-none font-black uppercase shadow-[-4px_-4px_0px_0px_rgba(var(--primary-rgb),0.5)] hover:shadow-none hover:-translate-x-[4px] hover:-translate-y-[4px] active:-translate-x-[4px] active:-translate-y-[4px] active:shadow-none transition-all flex items-center justify-center xl:justify-start gap-3 md:gap-4 group/demo"
                            >
                                <Lightning weight="fill" className="size-5 md:size-8 group-hover/demo:animate-pulse" /> Load Demo
                            </Button>
                        </div>
                    </section>
                </div>
            </main>

            <footer className="bg-black text-white p-2 md:p-3 xl:p-4 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-10 font-black uppercase text-[3vw] md:text-xl xl:text-2xl tracking-tight shrink-0 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, #ffffff 25%, transparent 25%, transparent 50%, #ffffff 50%, #ffffff 75%, transparent 75%, transparent)', backgroundSize: '4px 4px' }}></div>
                
                <div className="flex items-center gap-4 relative z-10">
                    <span className="bg-white text-black px-2 py-0.5 md:px-3 md:py-1 text-[2.5vw] md:text-base">&copy; {new Date().getFullYear()}</span>
                    <span className="text-[4vw] md:text-2xl">WHISTLERBOX</span>
                </div>
                <div className="flex flex-wrap justify-center items-center gap-x-6 md:gap-x-12 gap-y-4 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                            {ACCENT_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => setAccentTheme(option.id)}
                                    className={cn(
                                        "size-4 md:size-5 rounded-full border-2 transition-all hover:scale-110 active:scale-95",
                                        accentTheme === option.id 
                                            ? "border-white scale-125 shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                                            : "border-transparent opacity-50 hover:opacity-100"
                                    )}
                                    style={{ backgroundColor: option.color }}
                                    title={option.label}
                                />
                            ))}
                        </div>
                        <Link to="/legal/terms" state={{ from: 'welcome' }} className="hover:text-primary hover:line-through transition-all inline-block">Terms</Link>
                    </div>
                    <Link to="/legal/privacy" state={{ from: 'welcome' }} className="hover:text-primary hover:line-through transition-all inline-block">Privacy</Link>
                    <Link to="/legal/license" state={{ from: 'welcome' }} className="hover:text-primary hover:line-through transition-all inline-block">License</Link>
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
                <DialogContent className="w-[95vw] sm:max-w-lg bg-background border-[6px] md:border-[10px] border-black rounded-none shadow-[12px_12px_0px_0px_rgba(var(--primary-rgb),1)] p-4 md:p-10 gap-0 overflow-y-auto max-h-[90vh]">
                    {/* Dialog themed shading */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
                    
                    <DialogHeader className="mb-4 md:mb-10 text-left relative z-10">
                        <DialogTitle className="text-[8vw] md:text-5xl xl:text-6xl font-black uppercase leading-none tracking-tighter">
                            {phase === 'totp' ? 'Security Check' : 'Sync Access'}
                        </DialogTitle>
                        <DialogDescription className="text-sm md:text-lg font-bold uppercase italic mt-2 md:mt-3 text-foreground/80 tracking-tight">
                            {phase === 'totp' 
                                ? 'Enter the code from your authenticator app.' 
                                : 'Sign in with your 16-digit Sync ID.'}
                        </DialogDescription>
                    </DialogHeader>
                    {phase === 'login' ? (
                        <form onSubmit={handleWelcomeSignIn} className="space-y-3 md:space-y-4 relative z-10">
                            <div className="space-y-2 md:space-y-3">
                                <div className="text-[2.5vw] md:text-sm font-black uppercase tracking-[0.2em] bg-black text-white inline-block px-2 md:px-3 py-1 shadow-[2px_2px_0px_0px_rgba(var(--primary-rgb),1)]">
                                    Sync ID
                                </div>
                                <Input
                                    type="text"
                                    placeholder="0000-0000-0000-0000"
                                    value={syncId}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSyncId(formatAccountId(e.target.value))}
                                    className="h-12 md:h-20 font-mono text-base md:text-3xl bg-black border-[4px] md:border-[6px] border-black rounded-none focus-visible:ring-0 focus:border-primary text-white placeholder:text-white/10 font-black shadow-inner transition-colors"
                                    maxLength={19}
                                    minLength={16}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full h-10 md:h-12 text-base md:text-xl gap-3 rounded-none font-black uppercase text-white hover:text-primary hover:bg-white/5 transition-all"
                                    onClick={handleGenerateId}
                                >
                                    <Shuffle weight="bold" className="size-5 md:size-6" />
                                    <span>Generate New ID</span>
                                </Button>
                            </div>
                            <div className="w-full min-h-[90px] md:min-h-[140px] bg-black/40 border-[4px] md:border-[6px] border-black shadow-[6px_6px_0px_0px_rgba(var(--primary-rgb),0.6)] hover:shadow-[12px_12px_0px_0px_rgba(var(--primary-rgb),1)] hover:-translate-x-1 hover:-translate-y-1 transition-all flex justify-center items-center group/turnstile py-2 md:py-4 relative overflow-hidden">
                                {/* Captcha Placeholder */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6">
                                    <p className="text-[2.5vw] md:text-xs font-black uppercase text-white/20 text-center tracking-[0.2em] leading-tight">
                                        Captcha should be here, try reloading if not.
                                    </p>
                                </div>
                                <div
                                    ref={containerRef}
                                    className="flex items-center justify-center scale-[1.05] md:scale-[1.2] transition-transform duration-500 origin-center relative z-10"
                                />
                            </div>
                            {error && (
                                <div className="text-[2.5vw] md:text-sm bg-red-500 text-white font-black p-2 md:p-4 uppercase border-[4px] border-black text-center animate-shake">
                                    {error}
                                </div>
                            )}
                            <Button 
                                type="submit" 
                                disabled={isLoading || !captchaToken} 
                                className="w-full h-14 md:h-24 bg-white text-black font-black text-base md:text-3xl uppercase rounded-none border-[4px] md:border-[6px] border-black hover:bg-primary hover:text-primary-foreground disabled:opacity-50 shadow-[6px_6px_0px_0px_rgba(var(--primary-rgb),0.6)] hover:shadow-[12px_12px_0px_0px_rgba(var(--primary-rgb),1)] hover:-translate-x-1 hover:-translate-y-1 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
                            >
                                {isLoading ? "Verifying..." : "Continue"}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleTotpVerify} className="space-y-4 md:space-y-8 relative z-10">
                            <div className="space-y-2 md:space-y-4">
                                <div className="text-[2.5vw] md:text-sm font-black uppercase tracking-[0.2em] bg-black text-white inline-block px-2 md:px-3 py-1 shadow-[2px_2px_0px_0px_rgba(var(--primary-rgb),1)]">
                                    Verification Code
                                </div>
                                <Input
                                    type="text"
                                    placeholder="000000"
                                    value={totpCode}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                    className="h-12 md:h-20 font-mono text-xl md:text-5xl text-center bg-black border-[4px] md:border-[6px] border-black rounded-none focus-visible:ring-0 focus:border-primary text-white placeholder:text-white/10 font-black tracking-[0.5em] shadow-inner transition-colors"
                                    maxLength={6}
                                    required
                                    autoFocus
                                />
                            </div>
                            {error && (
                                <div className="text-[2.5vw] md:text-sm bg-red-500 text-white font-black p-2 md:p-4 uppercase border-[4px] border-black text-center animate-shake">
                                    {error}
                                </div>
                            )}
                            <Button 
                                type="submit" 
                                disabled={isLoading || totpCode.length !== 6} 
                                className="w-full h-14 md:h-24 bg-white text-black font-black text-base md:text-3xl uppercase rounded-none border-[4px] md:border-[6px] border-black hover:bg-primary hover:text-primary-foreground disabled:opacity-50 shadow-[6px_6px_0px_0px_rgba(var(--primary-rgb),0.6)] hover:shadow-[12px_12px_0px_0px_rgba(var(--primary-rgb),1)] hover:-translate-x-1 hover:-translate-y-1 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
                            >
                                {isLoading ? "Verifying..." : "Verify & Access"}
                            </Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
                <DialogContent className="w-[95vw] sm:max-w-md bg-background border-[6px] md:border-[10px] border-black rounded-none shadow-[12px_12px_0px_0px_rgba(var(--primary-rgb),1)] p-6 md:p-10 gap-0 overflow-y-auto max-h-[90vh]">
                    <DialogHeader className="mb-4 md:mb-6 text-left">
                        <DialogTitle className="text-3xl md:text-5xl font-black uppercase leading-none tracking-tighter">New Project</DialogTitle>
                        <DialogDescription className="text-base md:text-lg font-bold uppercase italic mt-2 text-foreground/80 tracking-tight">
                            Enter a name for your new project.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateProject} className="space-y-4 md:space-y-6">
                        <div className="space-y-2 md:space-y-3">
                            <div className="text-xs md:text-sm font-black uppercase tracking-[0.2em] bg-black text-white inline-block px-3 py-1 shadow-[2px_2px_0px_0px_rgba(var(--primary-rgb),1)]">
                                Project Name
                            </div>
                            <Input
                                placeholder="E.g. Cool Carrots"
                                value={newProjectName}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewProjectName(e.target.value)}
                                className="h-14 md:h-20 text-lg md:text-3xl bg-black border-[4px] md:border-[6px] border-black rounded-none focus-visible:ring-0 focus:border-primary font-black text-white placeholder:text-white/20 shadow-inner transition-colors"
                                autoFocus
                            />
                        </div>
                        <Button 
                            type="submit"
                            className="w-full h-16 md:h-24 bg-white text-black font-black text-lg md:text-3xl uppercase rounded-none border-[4px] md:border-[6px] border-black hover:bg-primary hover:text-primary-foreground shadow-[6px_6px_0px_0px_rgba(var(--primary-rgb),0.5)] hover:shadow-[12px_12px_0px_0px_rgba(var(--primary-rgb),1)] hover:-translate-x-1 hover:-translate-y-1 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
                        >
                            Create Project
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
