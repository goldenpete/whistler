import { NavigateFunction, Location } from "react-router-dom";
import { AppStore } from "@/store/useStore";
import { File, Collection } from "@/types";
import { 
    House, 
    HardDrives, 
    Gear, 
    FileText, 
    Graph, 
    Trash, 
    Plus, 
    HighlighterCircle, 
    Camera, 
    SpeakerSimpleHigh, 
    SpeakerSimpleSlash, 
    Play, 
    Pause,
    Moon,
    Sun,
    Sidebar,
    CaretRight,
    CaretLeft,
    MagnifyingGlassPlus,
    MagnifyingGlassMinus,
    ArrowsClockwise,
    ArrowClockwise,
    ArrowCounterClockwise
} from "@phosphor-icons/react";

export type ActionContext = {
    navigate: NavigateFunction;
    location: Location;
    store: AppStore;
};

export type ActionResult = 
    | { type: 'success', message?: string }
    | { type: 'error', message: string }
    | { type: 'keep-open' };

export interface ActionDefinition {
    id: string;
    labels: string[]; // Triggers, e.g. ["go home", "home"]
    description: string;
    icon: any;
    keywords?: string[]; // For fuzzy search
    execute: (context: ActionContext, args?: string[]) => ActionResult | Promise<ActionResult>;
    // If true, this action is only available in specific contexts
    available?: (context: ActionContext) => boolean;
}

export const ACTION_REGISTRY: ActionDefinition[] = [
    // --- Navigation ---
    {
        id: "nav.home",
        labels: ["Go Home", "Home"],
        description: "Navigate to the home dashboard",
        icon: House,
        execute: ({ navigate }) => {
            navigate("/");
            return { type: 'success' };
        }
    },
    {
        id: "nav.storage",
        labels: ["Go Storage", "Storage"],
        description: "Browse files and folders",
        icon: HardDrives,
        execute: ({ navigate }) => {
            navigate("/storage");
            return { type: 'success' };
        }
    },
    {
        id: "nav.settings",
        labels: ["Go Settings", "Settings"],
        description: "Open application settings",
        icon: Gear,
        execute: ({ navigate }) => {
            navigate("/settings");
            return { type: 'success' };
        }
    },
    {
        id: "nav.docs",
        labels: ["Go Docs", "Docs"],
        description: "View documents",
        icon: FileText,
        execute: ({ navigate }) => {
            navigate("/docs");
            return { type: 'success' };
        }
    },
    {
        id: "nav.graphs",
        labels: ["Go Graphs", "Graphs"],
        description: "View knowledge graphs",
        icon: Graph,
        execute: ({ navigate }) => {
            navigate("/graphs");
            return { type: 'success' };
        }
    },
    {
        id: "nav.trash",
        labels: ["Go Trash", "Trash"],
        description: "View deleted items",
        icon: Trash,
        execute: ({ navigate }) => {
            navigate("/trash");
            return { type: 'success' };
        }
    },

    // --- Creation (Simple) ---
    {
        id: "create.folder",
        labels: ["New Folder", "Create Folder"],
        description: "Create a new folder in current location",
        icon: Plus,
        available: ({ location }) => location.pathname.startsWith("/storage"),
        execute: ({ store, location, navigate }, args) => {
            // Determine parent ID from URL if possible
            const params = new URLSearchParams(location.search);
            const parentId = params.get("folderId") || null;
            const projectId = store.activeProjectId;
            
            if (!projectId) return { type: 'error', message: "No active project" };
            
            // Name is the rest of the args
            const name = args?.join(" ") || "New Folder";
            
             navigate("/storage?create=folder");
             return { type: 'success', message: "Opening creation dialog..." };
        }
    },

    // --- Player / Media Actions ---
    {
        id: "media.highlight",
        labels: ["Add Highlight", "Highlight"],
        description: "Create a highlight at current time",
        icon: HighlighterCircle,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'video' || file?.type === 'audio';
        },
        execute: ({ store, location }, args) => {
            const fileId = location.pathname.split("/").pop();
            if (!fileId) return { type: 'error', message: "No file context" };
            
            window.dispatchEvent(new CustomEvent("trigger-highlight", { 
                detail: { 
                    note: args?.join(" ") 
                } 
            }));
            
            return { type: 'success', message: "Highlight trigger sent" };
        }
    },
    {
        id: "media.screenshot",
        labels: ["Screenshot", "Take Screenshot"],
        description: "Capture current video frame",
        icon: Camera,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'video';
        },
        execute: ({ }) => {
            window.dispatchEvent(new CustomEvent("trigger-screenshot"));
            return { type: 'success' };
        }
    },
    {
        id: "media.mute",
        labels: ["Mute"],
        description: "Mute video",
        icon: SpeakerSimpleSlash,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'video';
        },
        execute: ({ }) => {
            window.dispatchEvent(new CustomEvent("trigger-mute"));
            return { type: 'success' };
        }
    },
    {
        id: "media.unmute",
        labels: ["Unmute"],
        description: "Unmute video",
        icon: SpeakerSimpleHigh,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'video';
        },
        execute: ({ }) => {
            window.dispatchEvent(new CustomEvent("trigger-unmute"));
            return { type: 'success' };
        }
    },
    {
        id: "media.play",
        labels: ["Play"],
        description: "Resume playback",
        icon: Play,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'video';
        },
        execute: ({ }) => {
            window.dispatchEvent(new CustomEvent("trigger-play"));
            return { type: 'success' };
        }
    },
    {
        id: "media.pause",
        labels: ["Pause"],
        description: "Pause playback",
        icon: Pause,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'video';
        },
        execute: ({ }) => {
            window.dispatchEvent(new CustomEvent("trigger-pause"));
            return { type: 'success' };
        }
    },

    // --- PDF Actions ---
    {
        id: "pdf.nextPage",
        labels: ["Next Page", "PDF Next"],
        description: "Go to next page",
        icon: CaretRight,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'pdf';
        },
        execute: () => {
            window.dispatchEvent(new CustomEvent("trigger-pdf-next"));
            return { type: 'success' };
        }
    },
    {
        id: "pdf.prevPage",
        labels: ["Previous Page", "PDF Previous"],
        description: "Go to previous page",
        icon: CaretLeft,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'pdf';
        },
        execute: () => {
            window.dispatchEvent(new CustomEvent("trigger-pdf-prev"));
            return { type: 'success' };
        }
    },
    {
        id: "pdf.zoomIn",
        labels: ["Zoom In", "PDF Zoom In"],
        description: "Zoom in PDF",
        icon: MagnifyingGlassPlus,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'pdf';
        },
        execute: () => {
            window.dispatchEvent(new CustomEvent("trigger-pdf-zoom-in"));
            return { type: 'success' };
        }
    },
    {
        id: "pdf.zoomOut",
        labels: ["Zoom Out", "PDF Zoom Out"],
        description: "Zoom out PDF",
        icon: MagnifyingGlassMinus,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'pdf';
        },
        execute: () => {
            window.dispatchEvent(new CustomEvent("trigger-pdf-zoom-out"));
            return { type: 'success' };
        }
    },

    // --- Image Actions ---
    {
        id: "image.zoomIn",
        labels: ["Zoom In", "Image Zoom In"],
        description: "Zoom in Image",
        icon: MagnifyingGlassPlus,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'image';
        },
        execute: () => {
            window.dispatchEvent(new CustomEvent("trigger-image-zoom-in"));
            return { type: 'success' };
        }
    },
    {
        id: "image.zoomOut",
        labels: ["Zoom Out", "Image Zoom Out"],
        description: "Zoom out Image",
        icon: MagnifyingGlassMinus,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'image';
        },
        execute: () => {
            window.dispatchEvent(new CustomEvent("trigger-image-zoom-out"));
            return { type: 'success' };
        }
    },
    {
        id: "image.resetZoom",
        labels: ["Reset Zoom", "Image Reset"],
        description: "Reset Image Zoom",
        icon: ArrowsClockwise,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'image';
        },
        execute: () => {
            window.dispatchEvent(new CustomEvent("trigger-image-reset"));
            return { type: 'success' };
        }
    },

    // --- Audio Actions ---
    {
        id: "audio.play",
        labels: ["Play", "Resume"],
        description: "Play audio",
        icon: Play,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'audio';
        },
        execute: () => {
            window.dispatchEvent(new CustomEvent("trigger-audio-play"));
            return { type: 'success' };
        }
    },
    {
        id: "audio.pause",
        labels: ["Pause"],
        description: "Pause audio",
        icon: Pause,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'audio';
        },
        execute: () => {
            window.dispatchEvent(new CustomEvent("trigger-audio-pause"));
            return { type: 'success' };
        }
    },
    {
        id: "audio.mute",
        labels: ["Mute"],
        description: "Mute audio",
        icon: SpeakerSimpleSlash,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'audio';
        },
        execute: () => {
            window.dispatchEvent(new CustomEvent("trigger-audio-mute"));
            return { type: 'success' };
        }
    },
    {
        id: "audio.unmute",
        labels: ["Unmute"],
        description: "Unmute audio",
        icon: SpeakerSimpleHigh,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'audio';
        },
        execute: () => {
            window.dispatchEvent(new CustomEvent("trigger-audio-unmute"));
            return { type: 'success' };
        }
    },
    {
        id: "audio.forward",
        labels: ["Forward 10s", "Skip"],
        description: "Skip forward 10 seconds",
        icon: ArrowClockwise,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'audio';
        },
        execute: () => {
            window.dispatchEvent(new CustomEvent("trigger-audio-seek-forward"));
            return { type: 'success' };
        }
    },
    {
        id: "audio.rewind",
        labels: ["Rewind 10s", "Back"],
        description: "Skip backward 10 seconds",
        icon: ArrowCounterClockwise,
        available: ({ location, store }) => {
            if (!location.pathname.startsWith("/file/")) return false;
            const fileId = location.pathname.split("/").pop();
            const file = store.files.find(f => f.id === fileId);
            return file?.type === 'audio';
        },
        execute: () => {
            window.dispatchEvent(new CustomEvent("trigger-audio-seek-backward"));
            return { type: 'success' };
        }
    },

    // --- System / UI ---
    {
        id: "ui.toggleSidebar",
        labels: ["Toggle Sidebar"],
        description: "Show or hide the sidebar",
        icon: Sidebar,
        execute: ({ }) => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true }));
            return { type: 'success' };
        }
    }
];
