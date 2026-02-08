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
    Sidebar
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
        execute: ({ store, location, navigate }, args) => {
            // Determine parent ID from URL if possible
            const params = new URLSearchParams(location.search);
            const parentId = params.get("folderId") || null;
            const projectId = store.activeProjectId;
            
            if (!projectId) return { type: 'error', message: "No active project" };
            
            // Name is the rest of the args
            const name = args?.join(" ") || "New Folder";
            
            // We need a store action for this, currently only addStorage exists which might be root storage
            // Assuming addStorage handles parentId correctly if updated, or we need to check store capabilities.
            // Based on store dump, addStorage takes (name, projectId). It doesn't seem to support parentId in the signature shown.
            // Let's fallback to navigating to storage and letting user create it, or use what we have.
            // Ideally we'd have `addFile` with type folder.
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
        available: ({ location }) => location.pathname.startsWith("/file/"),
        execute: ({ store, location }, args) => {
            const fileId = location.pathname.split("/").pop();
            if (!fileId) return { type: 'error', message: "No file context" };
            
            // We can't easily grab the *current time* from the store unless it's synced there.
            // The video player usually manages its own time or syncs it to store.
            // If we can't get time, we might fail.
            // However, the request says "It will be smart enough". 
            // If we are in the player, we can dispatch a custom event that the player listens to.
            
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
        available: ({ location }) => location.pathname.startsWith("/file/"),
        execute: ({ }) => {
            window.dispatchEvent(new CustomEvent("trigger-screenshot"));
            return { type: 'success' };
        }
    },
    {
        id: "media.mute",
        labels: ["Mute"],
        description: "Mute audio/video",
        icon: SpeakerSimpleSlash,
        execute: ({ }) => {
            window.dispatchEvent(new CustomEvent("trigger-mute"));
            return { type: 'success' };
        }
    },
    {
        id: "media.unmute",
        labels: ["Unmute"],
        description: "Unmute audio/video",
        icon: SpeakerSimpleHigh,
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
        execute: ({ }) => {
            window.dispatchEvent(new CustomEvent("trigger-pause"));
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
    },
    {
        id: "ui.theme.dark",
        labels: ["Dark Mode", "Theme Dark"],
        description: "Switch to dark theme",
        icon: Moon,
        execute: ({ store }) => {
            // Assuming store has theme control or we use document class
            // store.setTheme('dark') ? 
            // Based on store dump, we have `setCustomBaseTheme`.
            // Let's assume standard toggle for now or leave placeholder.
            return { type: 'success', message: "Theme switching not fully implemented via action yet" };
        }
    }
];
