import { useEffect, useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { motion, type Variants } from "framer-motion";
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
    FolderPlus, 
    Database, 
    Sparkle,
    CaretRight,
    Fingerprint,
    User as UserIcon,
    ArrowUpLeft
} from "@phosphor-icons/react";
import { WhistlerLogo } from "@/components/ui/WhistlerLogo";
import { NewProjectDialog } from "@/components/dialogs/CreationDialogs";
import { SettingsSync } from "@/components/settings/SettingsSync";
import { importProject, type ProjectExportData } from "@/utils/projectData";
import type { AccentTheme } from "@/types";
import { startAuthentication } from "@/utils/webauthn";

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
    // Animation variants
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const headerVariants: Variants = {
        hidden: { opacity: 0, y: -20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: "easeOut"
            }
        }
    };

    const cardVariants: Variants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1]
            }
        }
    };

    const { projects, user, addProject, setActiveProject, login, setLastSyncTime, setState, accentTheme, setAccentTheme } = useStore(useShallow((state: AppStore) => ({
        projects: state.projects,
        user: state.user,
        addProject: state.addProject,
        setActiveProject: state.setActiveProject,
        login: state.login,
        setLastSyncTime: state.setLastSyncTime,
        setState: state.setState,
        accentTheme: state.accentTheme,
        setAccentTheme: state.setAccentTheme,
    })));

    const [signInOpen, setSignInOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [phase, setPhase] = useState<'login' | 'totp'>('login');
    const [pendingToken, setPendingToken] = useState<string | null>(null);
    const [totpCode, setTotpCode] = useState("");
    
    const [syncId, setSyncId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null);
    const [newProjectOpen, setNewProjectOpen] = useState(false);
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
                            theme: "auto",
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
            const optionsResponse = await fetch(`${SYNC_API_URL}/passkeys/login/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ account_id: cleanId })
            });
            
            if (!optionsResponse.ok) {
                const errorData = await optionsResponse.json();
                throw new Error(errorData.error || "Failed to start passkey login");
            }
            
            const options = await optionsResponse.json();
            
            // 2. Get assertion using WebAuthn API
            const assertion = await startAuthentication(options);
            
            // 3. Send assertion to server to finish login
            const verifyResponse = await fetch(`${SYNC_API_URL}/passkeys/login/finish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    account_id: cleanId,
                    assertion
                })
            });
            
            if (!verifyResponse.ok) {
                const errorData = await verifyResponse.json();
                throw new Error(errorData.error || "Passkey login failed");
            }
            
            const data = await verifyResponse.json();
            await handleLoginSuccess(data.token, data.display_name);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Passkey login error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewProject = () => {
        setNewProjectOpen(true);
    };

    const handleCreateProject = (name: string) => {
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
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="min-h-screen xl:h-screen bg-background text-foreground font-sans flex flex-col border-x border-b border-border overflow-x-hidden xl:overflow-hidden select-none"
        >
            <motion.header 
                variants={headerVariants}
                className="flex flex-row justify-between items-center p-2 md:p-3 xl:p-4 relative z-20 border-b border-border"
            >
            <div className="flex items-center gap-3 md:gap-4 xl:gap-4">
                 <WhistlerLogo className="w-10 h-10 md:w-12 md:h-12 xl:w-14 xl:h-14 shrink-0 text-primary" />
                 <div className="flex flex-col items-start">
                     <h1 className="text-[6vw] md:text-xl xl:text-3xl font-bold tracking-tight leading-none">Whistlerbox</h1>
                     <p className="text-[2vw] md:text-[0.65rem] xl:text-[0.85rem] font-medium uppercase tracking-[0.25em] opacity-60 whitespace-nowrap leading-tight mt-0.5">Creative Project Management</p>
                 </div>
             </div>

                <div className="flex items-center gap-3 xl:gap-6">
                    {/* Sync Access / Profile Button */}
                    <motion.div 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => user ? setSettingsOpen(true) : setSignInOpen(true)}
                        className="group/sync cursor-pointer bg-muted/30 text-foreground border border-border p-1.5 md:p-2 flex items-center gap-2 md:gap-3 hover:bg-muted/50 hover:border-primary/50 transition-all relative overflow-hidden max-w-xs xl:max-w-sm self-start md:self-center"
                    >
                        <div className="bg-background text-foreground p-1 md:p-1.5 border border-border group-hover/sync:border-primary transition-colors shrink-0 flex items-center justify-center">
                            {user ? (
                                <UserIcon weight="bold" className="size-4 md:size-6 xl:size-7 group-hover/sync:text-primary transition-colors" />
                            ) : (
                                <CloudArrowUp weight="bold" className="size-4 md:size-6 xl:size-7 group-hover/sync:text-primary transition-colors" />
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h3 className="text-sm md:text-lg xl:text-xl font-bold uppercase leading-none transition-colors truncate">
                                {user ? (user.email.split('@')[0]) : "Sync Access"}
                            </h3>
                            <p className="text-[7px] md:text-[9px] xl:text-xs font-normal uppercase italic opacity-60 group-hover/sync:opacity-100 transition-opacity leading-tight">
                                {user ? "Sync Settings" : "Remote access"}
                            </p>
                        </div>
                    </motion.div>
                </div>
            </motion.header>

            <main className="flex-grow grid grid-cols-1 xl:grid-cols-12 min-h-0">
                {/* Primary Action Card */}
                <motion.section 
                    variants={cardVariants}
                    className="xl:col-span-7 bg-background xl:border-r border-border p-3 md:p-5 xl:p-6 flex flex-col justify-center xl:justify-between group hover:bg-muted/10 transition-colors relative min-h-[300px] xl:min-h-0 shrink-0 xl:shrink">
                    
                    {/* Themed gradient highlight - originating from true corner */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-20 -left-20 size-[500px] bg-primary/20 blur-[100px] rounded-full group-hover:bg-primary/35 transition-all duration-500 z-0"></div>
                        <div className="absolute top-[-5%] right-[-5%] opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-105 transition-all duration-700 text-primary">
                            <FolderPlus weight="fill" className="size-[200px] md:size-[500px] -rotate-12" />
                        </div>
                    </div>
                    
                    <div className="relative z-10 flex-shrink mb-4 xl:mb-0">
                        <div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-4 relative">
                            <div className="bg-muted text-foreground p-2 md:p-3 border border-border group-hover:border-primary transition-colors">
                                <Plus weight="bold" className="size-6 md:size-10 group-hover:text-primary transition-colors" />
                            </div>
                            <h2 className="text-[8vw] md:text-5xl xl:text-7xl font-bold uppercase leading-none tracking-tight group-hover:text-primary transition-colors">
                                Start Fresh
                            </h2>
                        </div>
                        <p className="text-[4vw] md:text-xl xl:text-3xl leading-tight mb-3 md:mb-6 font-normal max-w-2xl opacity-70 group-hover:opacity-100 transition-opacity">
                            Create a new project and start organizing your files, highlights, and thoughts in a modern creative environment.
                        </p>
                    </div>

                    <div className="relative">
                        <Button 
                            onClick={handleNewProject}
                            variant="outline"
                            className="w-full xl:w-fit text-lg md:text-2xl xl:text-4xl py-4 md:py-8 xl:py-10 px-6 md:px-16 xl:px-20 rounded-none font-bold uppercase hover:text-primary border-border hover:border-primary transition-all flex items-center justify-center xl:justify-start gap-3 md:gap-6 group/btn relative z-10"
                        >
                            Create Project <CaretRight weight="bold" className="size-6 md:size-10 group-hover/btn:translate-x-2 transition-transform" />
                        </Button>

                        {projects.length === 0 && (
                            <>
                                {/* Desktop Arrow - Positioned ABOVE the button, pointing DOWN */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute bottom-full left-0 mb-8 hidden xl:flex items-center gap-6 text-primary whitespace-nowrap z-20"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-5xl font-black uppercase italic tracking-tighter leading-none">Start Here</span>
                                        <span className="text-sm font-bold opacity-80 uppercase tracking-[0.3em] mt-1">Create your first project</span>
                                    </div>
                                    <div className="relative">
                                        <ArrowUpLeft weight="bold" className="size-16 rotate-[135deg] animate-bounce" />
                                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                                    </div>
                                </motion.div>

                                {/* Mobile Arrow - Simple bottom indicator */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-6 flex xl:hidden items-center gap-4 text-primary bg-primary/5 p-4 border border-primary/20"
                                >
                                    <ArrowUpLeft weight="bold" className="size-8 rotate-180 animate-bounce" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black uppercase italic">Create your first project</span>
                                        <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Everything starts here.</span>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </div>
                </motion.section>

                {/* Secondary Action Cards */}
                <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 xl:grid-rows-2 min-h-0 shrink-0 xl:shrink">
                    <motion.section 
                        variants={cardVariants}
                        className="bg-background sm:border-r xl:border-r-0 xl:border-b border-border p-2 md:p-3 xl:p-4 flex flex-col justify-between group hover:bg-muted/10 transition-colors relative overflow-hidden min-h-[250px] xl:min-h-0"
                    >
                        
                        {/* Themed gradient highlight - originating from true corner */}
                        <div className="absolute -top-12 -left-12 size-48 bg-primary/25 blur-[60px] rounded-full pointer-events-none group-hover:bg-primary/40 transition-all duration-500 z-0"></div>

                        <div className="absolute bottom-[-10%] right-[-5%] opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-105 transition-all duration-700 pointer-events-none text-primary">
                            <Database weight="fill" className="size-[120px] md:size-[300px]" />
                        </div>

                        <div className="relative z-10 flex-shrink">
                            <h2 className="text-[6vw] md:text-3xl xl:text-4xl font-bold uppercase mb-1 md:mb-2 bg-muted text-foreground inline-block px-2 py-1 border-l-2 border-primary group-hover:bg-background group-hover:text-primary transition-colors relative">
                                Import
                            </h2>
                            <p className="text-[3.5vw] md:text-lg xl:text-xl leading-tight mb-2 md:mb-3 font-normal max-w-md group-hover:text-foreground transition-colors opacity-70 group-hover:opacity-100">
                                Have an existing project? Import your JSON project here.
                            </p>
                        </div>

                        <Button 
                            onClick={handleImportProject}
                            variant="outline"
                            className="w-full xl:w-fit text-lg md:text-xl xl:text-2xl py-3 md:py-6 xl:py-8 px-6 md:px-10 xl:px-12 rounded-none font-bold uppercase hover:text-primary border-border hover:border-primary transition-all flex items-center justify-center xl:justify-start gap-3 md:gap-4 relative z-10 group/import"
                        >
                            <DownloadSimple weight="bold" className="size-5 md:size-8 group-hover/import:scale-110 transition-transform" /> Import Project
                        </Button>
                    </motion.section>

                    <motion.section 
                        variants={cardVariants}
                        className="bg-background p-2 md:p-3 xl:p-4 flex flex-col justify-between group hover:bg-muted/10 transition-colors relative overflow-hidden min-h-[250px] xl:min-h-0"
                    >
                        
                        {/* Themed gradient highlight - originating from true corner */}
                        <div className="absolute -top-12 -right-12 size-48 bg-primary/25 blur-[60px] rounded-full pointer-events-none group-hover:bg-primary/40 transition-all duration-500 z-0"></div>

                        <div className="absolute top-[-10%] left-[-5%] opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-105 transition-all duration-700 pointer-events-none text-primary">
                            <Sparkle weight="fill" className="size-[120px] md:size-[300px] rotate-12" />
                        </div>

                        <div className="relative z-10 flex flex-col items-end text-right flex-shrink">
                            <h2 className="text-[6vw] md:text-3xl xl:text-4xl font-bold uppercase mb-1 md:mb-2 bg-muted text-foreground inline-block px-2 py-1 border-r-2 border-primary group-hover:bg-background group-hover:text-primary transition-colors relative">
                                Quick Start
                            </h2>
                            <p className="text-[3.5vw] md:text-lg xl:text-xl leading-tight mb-2 md:mb-3 font-normal max-w-md group-hover:text-foreground transition-colors opacity-70 group-hover:opacity-100">
                                Not ready to commit? Load a demo project to explore the features.
                            </p>
                        </div>

                        <div className="flex justify-end relative z-10">
                            <Button 
                                onClick={handleLoadDemo}
                                variant="outline"
                                className="w-full xl:w-fit text-lg md:text-xl xl:text-2xl py-3 md:py-6 xl:py-8 px-6 md:px-10 xl:px-12 rounded-none font-bold uppercase hover:text-primary border-border hover:border-primary transition-all flex items-center justify-center xl:justify-start gap-3 md:gap-4 group/demo"
                            >
                                <Lightning weight="fill" className="size-5 md:size-8 group-hover/demo:animate-pulse" /> Load Demo
                            </Button>
                        </div>
                    </motion.section>
                </div>
            </main>

            <motion.footer 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="bg-background text-foreground border-t border-border p-2 md:p-2.5 xl:p-3 flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4 shrink-0 transition-all duration-300 relative z-20"
            >
                <div className="flex items-center gap-4 order-2 md:order-1 opacity-40 hover:opacity-100 transition-opacity">
                    <span className="text-xs md:text-sm font-bold tracking-tighter uppercase">WHISTLERBOX</span>
                    <span className="text-[10px] md:text-xs font-medium">&copy; {new Date().getFullYear()}</span>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 order-1 md:order-2">
                    <div className="flex items-center gap-2 px-2 py-1 bg-muted/30 border border-border/50 rounded-full">
                        {ACCENT_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => setAccentTheme(option.id)}
                                className={cn(
                                    "size-4 md:size-5 rounded-full border-2 transition-all hover:scale-110 active:scale-95",
                                    accentTheme === option.id 
                                        ? "border-foreground scale-110 shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]" 
                                        : "border-transparent opacity-40 hover:opacity-100"
                                )}
                                style={{ backgroundColor: option.color }}
                                title={option.label}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-3 text-xs md:text-sm font-medium opacity-40">
                        <Link to="/legal/terms" state={{ from: 'welcome' }} className="hover:text-primary transition-all hover:opacity-100">Terms</Link>
                        <span className="size-1 bg-border rounded-full" />
                        <Link to="/legal/privacy" state={{ from: 'welcome' }} className="hover:text-primary transition-all hover:opacity-100">Privacy</Link>
                        <span className="size-1 bg-border rounded-full" />
                        <Link to="/legal/license" state={{ from: 'welcome' }} className="hover:text-primary transition-all hover:opacity-100">License</Link>
                    </div>
                </div>
            </motion.footer>

            {/* Dialogs */}
            <Dialog open={signInOpen} onOpenChange={(open: boolean) => {
                setSignInOpen(open);
                if (!open) {
                    setPhase('login');
                    setPendingToken(null);
                    setTotpCode("");
                }
            }}>
                <DialogContent className="sm:max-w-sm bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>{phase === 'totp' ? 'Two-Factor Authentication' : 'Sync Access'}</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {phase === 'totp' 
                                ? 'Enter the code from your authenticator app.' 
                                : 'Sign in with your 16-digit Sync ID to load existing Whistlerbox data.'}
                        </DialogDescription>
                    </DialogHeader>
                    {phase === 'login' ? (
                        <form onSubmit={handleWelcomeSignIn} className="space-y-4">
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                    Sync ID
                                </div>
                                <Input
                                    type="text"
                                    placeholder="16-digit ID"
                                    value={syncId}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSyncId(formatAccountId(e.target.value))}
                                    className="h-9 font-mono text-sm bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                                    maxLength={19}
                                    minLength={16}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-9 mt-1 text-xs gap-2 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
                                    onClick={handleGenerateId}
                                    title="Generate New Account ID"
                                >
                                    <Shuffle weight="bold" className="size-4" />
                                    <span>Generate New Account ID</span>
                                </Button>
                            </div>
                            <div className="flex justify-center">
                                <div
                                    ref={containerRef}
                                    className="min-h-[65px]"
                                />
                            </div>
                            {error && (
                                <div className="text-xs text-red-400 text-center px-2">
                                    {error}
                                </div>
                            )}
                            <div className="flex flex-col gap-3">
                                <Button 
                                    type="submit" 
                                    disabled={isLoading || !captchaToken} 
                                    className="w-full h-10 bg-primary text-primary-foreground hover:opacity-90"
                                >
                                    {isLoading ? "Verifying..." : "Continue"}
                                </Button>
                                <div className="flex items-center gap-2">
                                    <div className="h-[1px] flex-1 bg-zinc-800" />
                                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">or</span>
                                    <div className="h-[1px] flex-1 bg-zinc-800" />
                                </div>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="w-full h-10 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900" 
                                    onClick={handlePasskeyLogin} 
                                    disabled={isLoading}
                                >
                                    <Fingerprint className="mr-2" size={16} />
                                    Sign in with Passkey
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleTotpVerify} className="space-y-4">
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                    Verification Code
                                </div>
                                <Input
                                    type="text"
                                    placeholder="000000"
                                    value={totpCode}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                    className="h-9 text-center tracking-[0.5em] text-lg font-mono bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                                    maxLength={6}
                                    required
                                    autoFocus
                                />
                            </div>
                            {error && (
                                <div className="text-xs text-red-400 text-center px-2">
                                    {error}
                                </div>
                            )}
                            <Button 
                                type="submit" 
                                disabled={isLoading || totpCode.length !== 6} 
                                className="w-full h-10 bg-primary text-primary-foreground hover:opacity-90"
                            >
                                {isLoading ? "Verifying..." : "Verify & Access"}
                            </Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <NewProjectDialog 
                open={newProjectOpen} 
                onOpenChange={setNewProjectOpen} 
                onSubmit={handleCreateProject} 
            />

            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-white p-0">
                    <div className="p-8">
                        <SettingsSync />
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
