/**
 * ─── keybinds.ts ─────────────────────────────────────────────────────────────
 *
 * Keyboard shortcut registry for all actions in Whistler.
 *
 * Each entry in KEYBIND_REGISTRY maps an action ID to:
 *   - label: human-readable name
 *   - defaultKey: default key combination (e.g. "ctrl+k", "g+h")
 *   - category: grouping for the settings UI
 *   - icon: Phosphor icon for display
 *   - isSequence: true for key sequences like "g+h" (two keys in succession)
 *
 * Categories: Global, Navigation, Storage, Video, Audio, PDF, Image, Docs, Graph
 *
 * Key format:
 *   - Modifier + key: "ctrl+s", "shift+?", "alt+arrowdown"
 *   - Sequence: "g+h" (press g, then h) — handled by GlobalKeybinds.tsx
 *   - Single key: "space", "f", "escape"
 *
 * Users can override these in Settings → Keybinds. Overrides are stored
 * in the keybindSlice (customKeybinds / disabledKeybinds).
 *
 * Used by:
 *   - hooks/use-keybind.ts → resolves action ID to actual key combo
 *   - components/GlobalKeybinds.tsx → registers all global shortcuts
 *   - components/settings/KeybindsSettings.tsx → keybind editor UI
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Icon } from "@phosphor-icons/react";
import { 
    CornersOut, 
    MagnifyingGlass, 
    Gear, 
    CornersIn, 
    House, 
    HardDrives, 
    FileText, 
    PencilSimple, 
    Graph,
    CaretRight,
    CaretUp,
    CheckSquare,
    FilmStrip,
    CaretLeft,
    SpeakerHigh,
    Image,
    X,
    ArrowsOut,
    Plus,
    Minus,
    CaretDown,
    Trash,
    ArrowSquareOut
} from "@phosphor-icons/react";

type KeybindCategory = 'Global' | 'Navigation' | 'Storage' | 'Video' | 'Audio' | 'PDF' | 'Image' | 'Graph' | 'Docs';

export interface KeybindDefinition {
    id: string;
    label: string;
    description?: string;
    defaultKey: string;
    category: KeybindCategory;
    icon?: Icon;
    isSequence?: boolean; // e.g., G+H
}

export const KEYBIND_REGISTRY: Record<string, KeybindDefinition> = {
    // Global
    "global.showShortcuts": { id: "global.showShortcuts", label: "Show Shortcuts", defaultKey: "shift+?", category: "Global", icon: CornersOut },
    "global.search": { id: "global.search", label: "Spotlight Search", defaultKey: "ctrl+k", category: "Global", icon: MagnifyingGlass },
    "global.search.slash": { id: "global.search.slash", label: "Spotlight Search (Alt)", defaultKey: "/", category: "Global", icon: MagnifyingGlass },
    "global.doubleTapMenu": { id: "global.doubleTapMenu", label: "Double Tap Menu", defaultKey: "shift shift", category: "Global", icon: CornersOut, isSequence: true }, // Special handling needed
    "global.settings": { id: "global.settings", label: "Settings", defaultKey: "ctrl+,", category: "Global", icon: Gear },
    "global.toggleSidebar": { id: "global.toggleSidebar", label: "Toggle Sidebar", defaultKey: "ctrl+b", category: "Global", icon: CornersIn },
    
    // Navigation
    "nav.home": { id: "nav.home", label: "Go Home", defaultKey: "g+h", category: "Navigation", icon: House, isSequence: true },
    "nav.home.num": { id: "nav.home.num", label: "Go Home (Num)", defaultKey: "5", category: "Navigation", icon: House },
    
    "nav.storage": { id: "nav.storage", label: "Go to Storage", defaultKey: "g+s", category: "Navigation", icon: HardDrives, isSequence: true },
    "nav.storage.num": { id: "nav.storage.num", label: "Go to Storage (Num)", defaultKey: "1", category: "Navigation", icon: HardDrives },

    "nav.collections": { id: "nav.collections", label: "Go to Collections", defaultKey: "g+c", category: "Navigation", icon: FileText, isSequence: true },
    "nav.collections.num": { id: "nav.collections.num", label: "Go to Collections (Num)", defaultKey: "4", category: "Navigation", icon: FileText },

    "nav.docs": { id: "nav.docs", label: "Go to Docs", defaultKey: "g+d", category: "Navigation", icon: PencilSimple, isSequence: true },
    "nav.docs.num": { id: "nav.docs.num", label: "Go to Docs (Num)", defaultKey: "2", category: "Navigation", icon: PencilSimple },

    "nav.graphs": { id: "nav.graphs", label: "Go to Graphs", defaultKey: "g+g", category: "Navigation", icon: Graph, isSequence: true },
    "nav.graphs.num": { id: "nav.graphs.num", label: "Go to Graphs (Num)", defaultKey: "3", category: "Navigation", icon: Graph },
    
    "nav.nextItem": { id: "nav.nextItem", label: "Next Sidebar Item", defaultKey: "ctrl+alt+arrowdown", category: "Navigation", icon: CaretDown },
    "nav.prevItem": { id: "nav.prevItem", label: "Previous Sidebar Item", defaultKey: "ctrl+alt+arrowup", category: "Navigation", icon: CaretUp },
    "nav.listUp": { id: "nav.listUp", label: "List Up", defaultKey: "arrowup", category: "Navigation", icon: CaretUp },
    "nav.listDown": { id: "nav.listDown", label: "List Down", defaultKey: "arrowdown", category: "Navigation", icon: CaretDown },
    
    // Storage
    "storage.up": { id: "storage.up", label: "Go Up Directory", defaultKey: "backspace", category: "Storage", icon: CaretUp },
    "storage.select": { id: "storage.select", label: "Select Item", defaultKey: "space", category: "Storage", icon: CheckSquare },
    "storage.rename": { id: "storage.rename", label: "Rename Item", defaultKey: "f2", category: "Storage", icon: PencilSimple },
    "storage.delete": { id: "storage.delete", label: "Delete Item", defaultKey: "delete", category: "Storage", icon: Trash },
    "storage.selectAll": { id: "storage.selectAll", label: "Select All", defaultKey: "ctrl+a", category: "Storage", icon: CheckSquare },
    "storage.clearSelection": { id: "storage.clearSelection", label: "Clear Selection", defaultKey: "escape", category: "Storage", icon: X },
    "storage.navUp": { id: "storage.navUp", label: "Navigate Up", defaultKey: "arrowup", category: "Storage", icon: CaretUp },
    "storage.navDown": { id: "storage.navDown", label: "Navigate Down", defaultKey: "arrowdown", category: "Storage", icon: CaretDown },
    "storage.navLeft": { id: "storage.navLeft", label: "Navigate Left", defaultKey: "arrowleft", category: "Storage", icon: CaretLeft },
    "storage.navRight": { id: "storage.navRight", label: "Navigate Right", defaultKey: "arrowright", category: "Storage", icon: CaretRight },
    "storage.open": { id: "storage.open", label: "Open Item", defaultKey: "enter", category: "Storage", icon: ArrowSquareOut },
    
    // Video
    "video.playPause": { id: "video.playPause", label: "Play / Pause", defaultKey: "space", category: "Video", icon: FilmStrip },
    "video.seekBack10": { id: "video.seekBack10", label: "Seek Backward 10s", defaultKey: "j", category: "Video", icon: CaretLeft },
    "video.seekFwd10": { id: "video.seekFwd10", label: "Seek Forward 10s", defaultKey: "l", category: "Video", icon: CaretRight },
    "video.seekBack5": { id: "video.seekBack5", label: "Seek Backward 5s", defaultKey: "arrowleft", category: "Video", icon: CaretLeft },
    "video.seekFwd5": { id: "video.seekFwd5", label: "Seek Forward 5s", defaultKey: "arrowright", category: "Video", icon: CaretRight },
    "video.mute": { id: "video.mute", label: "Mute / Unmute", defaultKey: "m", category: "Video", icon: SpeakerHigh },
    "video.volUp": { id: "video.volUp", label: "Volume Up", defaultKey: "arrowup", category: "Video", icon: SpeakerHigh },
    "video.volDown": { id: "video.volDown", label: "Volume Down", defaultKey: "arrowdown", category: "Video", icon: SpeakerHigh },
    "video.fullscreen": { id: "video.fullscreen", label: "Fullscreen", defaultKey: "f", category: "Video", icon: CornersOut },
    "video.screenshot": { id: "video.screenshot", label: "Take Screenshot", defaultKey: "s", category: "Video", icon: Image },
    "video.close": { id: "video.close", label: "Close Player", defaultKey: "escape", category: "Video", icon: X },
    
    // Audio (reusing video where possible or defined separately)
    "audio.playPause": { id: "audio.playPause", label: "Play / Pause", defaultKey: "space", category: "Audio", icon: FilmStrip },
    "audio.seekBack10": { id: "audio.seekBack10", label: "Seek Backward 10s", defaultKey: "j", category: "Audio", icon: CaretLeft },
    "audio.seekFwd10": { id: "audio.seekFwd10", label: "Seek Forward 10s", defaultKey: "l", category: "Audio", icon: CaretRight },
    "audio.seekBack5": { id: "audio.seekBack5", label: "Seek Backward 5s", defaultKey: "arrowleft", category: "Audio", icon: CaretLeft },
    "audio.seekFwd5": { id: "audio.seekFwd5", label: "Seek Forward 5s", defaultKey: "arrowright", category: "Audio", icon: CaretRight },
    "audio.mute": { id: "audio.mute", label: "Mute / Unmute", defaultKey: "m", category: "Audio", icon: SpeakerHigh },
    "audio.close": { id: "audio.close", label: "Close Player", defaultKey: "escape", category: "Audio", icon: X },

    // PDF
    "pdf.prevPage": { id: "pdf.prevPage", label: "Previous Page", defaultKey: "arrowleft", category: "PDF", icon: CaretLeft },
    "pdf.nextPage": { id: "pdf.nextPage", label: "Next Page", defaultKey: "arrowright", category: "PDF", icon: CaretRight },
    "pdf.close": { id: "pdf.close", label: "Close Viewer", defaultKey: "escape", category: "PDF", icon: X },
    "pdf.zoomIn": { id: "pdf.zoomIn", label: "Zoom In", defaultKey: "=", category: "PDF", icon: MagnifyingGlass },
    "pdf.zoomOut": { id: "pdf.zoomOut", label: "Zoom Out", defaultKey: "-", category: "PDF", icon: MagnifyingGlass },
    
    // Image
    "image.zoomIn": { id: "image.zoomIn", label: "Zoom In", defaultKey: "=", category: "Image", icon: MagnifyingGlass },
    "image.zoomOut": { id: "image.zoomOut", label: "Zoom Out", defaultKey: "-", category: "Image", icon: MagnifyingGlass },
    "image.resetZoom": { id: "image.resetZoom", label: "Reset Zoom", defaultKey: "0", category: "Image", icon: MagnifyingGlass },
    "image.close": { id: "image.close", label: "Close Viewer", defaultKey: "escape", category: "Image", icon: X },

    // Docs
    "docs.next": { id: "docs.next", label: "Next Document", defaultKey: "alt+arrowdown", category: "Docs", icon: CaretDown },
    "docs.save": { id: "docs.save", label: "Save", defaultKey: "ctrl+s", category: "Docs", icon: FileText },
    "docs.link": { id: "docs.link", label: "Insert Link", defaultKey: "ctrl+shift+k", category: "Docs", icon: FileText },
    "docs.bold": { id: "docs.bold", label: "Bold", defaultKey: "ctrl+b", category: "Docs", icon: FileText },
    "docs.italic": { id: "docs.italic", label: "Italic", defaultKey: "ctrl+i", category: "Docs", icon: FileText },
    "docs.underline": { id: "docs.underline", label: "Underline", defaultKey: "ctrl+u", category: "Docs", icon: FileText },
    "docs.alignCenter": { id: "docs.alignCenter", label: "Align Center", defaultKey: "ctrl+shift+e", category: "Docs", icon: FileText },
    "docs.alignLeft": { id: "docs.alignLeft", label: "Align Left", defaultKey: "ctrl+shift+l", category: "Docs", icon: FileText },
    "docs.alignRight": { id: "docs.alignRight", label: "Align Right", defaultKey: "ctrl+shift+r", category: "Docs", icon: FileText },
    "docs.bulletList": { id: "docs.bulletList", label: "Bullet List", defaultKey: "ctrl+shift+8", category: "Docs", icon: FileText },
    "docs.viewMode": { id: "docs.viewMode", label: "Toggle View Mode", defaultKey: "alt+l", category: "Docs", icon: FileText },
    "docs.blur": { id: "docs.blur", label: "Blur Editor", defaultKey: "escape", category: "Docs", icon: X },
    
    // Graph
    "graph.delete": { id: "graph.delete", label: "Delete Selection", defaultKey: "delete", category: "Graph", icon: X },
    "graph.newNode": { id: "graph.newNode", label: "New Node", defaultKey: "n", category: "Graph", icon: Graph },
    "graph.center": { id: "graph.center", label: "Center Graph", defaultKey: "space", category: "Graph", icon: Graph },
    "graph.zoomIn": { id: "graph.zoomIn", label: "Zoom In", defaultKey: "=", category: "Graph", icon: MagnifyingGlass },
    "graph.zoomOut": { id: "graph.zoomOut", label: "Zoom Out", defaultKey: "-", category: "Graph", icon: MagnifyingGlass },
    "graph.panUp": { id: "graph.panUp", label: "Pan Up", defaultKey: "arrowup", category: "Graph", icon: CaretUp },
    "graph.panDown": { id: "graph.panDown", label: "Pan Down", defaultKey: "arrowdown", category: "Graph", icon: CaretDown },
    "graph.panLeft": { id: "graph.panLeft", label: "Pan Left", defaultKey: "arrowleft", category: "Graph", icon: CaretLeft },
    "graph.panRight": { id: "graph.panRight", label: "Pan Right", defaultKey: "arrowright", category: "Graph", icon: CaretRight },
    "graph.panUpFast": { id: "graph.panUpFast", label: "Pan Up (Fast)", defaultKey: "shift+arrowup", category: "Graph", icon: CaretUp },
    "graph.panDownFast": { id: "graph.panDownFast", label: "Pan Down (Fast)", defaultKey: "shift+arrowdown", category: "Graph", icon: CaretDown },
    "graph.panLeftFast": { id: "graph.panLeftFast", label: "Pan Left (Fast)", defaultKey: "shift+arrowleft", category: "Graph", icon: CaretLeft },
    "graph.panRightFast": { id: "graph.panRightFast", label: "Pan Right (Fast)", defaultKey: "shift+arrowright", category: "Graph", icon: CaretRight },
};

export const KEYBIND_CATEGORIES: KeybindCategory[] = [
    'Global', 'Navigation', 'Storage', 'Video', 'Audio', 'PDF', 'Image', 'Docs', 'Graph'
];
