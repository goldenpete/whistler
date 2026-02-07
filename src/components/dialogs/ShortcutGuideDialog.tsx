import React, { type ReactNode, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CaretRight, CaretLeft, CornersOut, CornersIn, SpeakerHigh, Image, FilmStrip, FileText, House, Folder, Graph, MagnifyingGlass, Gear, HardDrives, Trash, PencilSimple, CaretUp, CheckSquare, X } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/store/useStore";
import { KEYBIND_REGISTRY } from "@/constants/keybinds";

interface ShortcutGuideDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const Key = ({ children }: { children: ReactNode }) => (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold font-mono text-zinc-400 bg-zinc-800 border border-zinc-700 rounded shadow-[0_1px_0_rgba(0,0,0,0.2)] select-none uppercase whitespace-nowrap">
        {children}
    </span>
);

const ShortcutRow = ({ label, keys, icon: Icon }: { label: string, keys: ReactNode[], icon?: any }) => (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
        <div className="flex items-center gap-3">
            {Icon && <Icon className="text-zinc-400" size={16} />}
            <span className="text-sm text-zinc-300">{label}</span>
        </div>
        <div className="flex items-center gap-1">
            {keys.map((k, i) => {
                // Check if this element or the previous one is an "or" separator to avoid adding "+"
                const isSeparator = React.isValidElement(k) && (k.props as any).className?.includes('text-zinc-500');
                const prevWasSeparator = i > 0 && React.isValidElement(keys[i-1]) && (keys[i-1] as any).props?.className?.includes('text-zinc-500');
                
                // If it's the first item, no plus.
                // If this is a separator, no plus.
                // If the previous was a separator, no plus.
                const showPlus = i > 0 && !isSeparator && !prevWasSeparator;

                return (
                    <div key={i} className="flex items-center gap-1">
                        {showPlus && <span className="text-zinc-600 text-xs">+</span>}
                        {k}
                    </div>
                );
            })}
        </div>
    </div>
);

// Helper to render dynamic row based on IDs
const DynamicShortcutRow = ({ ids, label, icon: Icon, customKeys, extraKeys }: { ids?: string[], label?: string, icon?: any, customKeys?: ReactNode[], extraKeys?: ReactNode[] }) => {
    const { customKeybinds } = useStore();

    if (customKeys) {
        return <ShortcutRow label={label!} icon={Icon} keys={customKeys} />;
    }

    if (!ids || ids.length === 0) return null;

    // Use the first ID's definition for label/icon if not provided
    const primaryDef = KEYBIND_REGISTRY[ids[0]];
    if (!primaryDef) return null;

    const rowLabel = label || primaryDef.label;
    const RowIcon = Icon || primaryDef.icon;

    const keysToRender: ReactNode[] = [];
    
    ids.forEach((id, index) => {
        const def = KEYBIND_REGISTRY[id];
        if (!def) return;
        
        const keyStr = customKeybinds[id] || def.defaultKey;
        
        if (index > 0) {
            keysToRender.push(<span key={`sep-${index}`} className="text-xs text-zinc-500 mx-1">or</span>);
        }
        
        const parts = keyStr.includes(' ') ? keyStr.split(' ') : keyStr.split('+');
        
        parts.forEach((part, pIndex) => {
             keysToRender.push(<Key key={`${id}-${pIndex}`}>{part}</Key>);
        });
    });

    if (extraKeys) {
        keysToRender.push(<span key="sep-extra" className="text-xs text-zinc-500 mx-1">or</span>);
        keysToRender.push(...extraKeys);
    }

    return <ShortcutRow label={rowLabel} icon={RowIcon} keys={keysToRender} />;
}

// Data Definition
type GuideItem = 
    | { type: 'dynamic', ids: string[], label?: string, extraKeys?: ReactNode[] }
    | { type: 'header', label: string }
    | { type: 'custom', label: string, icon: any, keys: ReactNode[] };

const GUIDE_DATA: Record<string, GuideItem[]> = {
    global: [
        { type: 'dynamic', ids: ["global.showShortcuts"] },
        { type: 'dynamic', ids: ["global.spotlight"] },
        { type: 'dynamic', ids: ["global.doubleTapMenu"] },
        { type: 'dynamic', ids: ["global.settings"] },
        { type: 'dynamic', ids: ["global.toggleSidebar"] },
    ],
    navigation: [
        { type: 'header', label: 'Go To...' },
        { type: 'dynamic', ids: ["nav.home.num", "nav.home"], label: "Home" },
        { type: 'dynamic', ids: ["nav.storage.num", "nav.storage"], label: "Storage" },
        { type: 'dynamic', ids: ["nav.collections.num", "nav.collections"], label: "Collections" },
        { type: 'dynamic', ids: ["nav.docs.num", "nav.docs"], label: "Docs" },
        { type: 'dynamic', ids: ["nav.graphs.num", "nav.graphs"], label: "Graphs" },
    ],
    storage: [
        { type: 'header', label: 'Navigation' },
        { type: 'dynamic', ids: ["storage.navUp", "storage.navDown", "storage.navLeft", "storage.navRight"], label: "Navigate Items" },
        { type: 'dynamic', ids: ["storage.open"] },
        { type: 'dynamic', ids: ["storage.up"] },
        { type: 'header', label: 'Selection' },
        { type: 'dynamic', ids: ["storage.select"] },
        { type: 'dynamic', ids: ["storage.selectAll"] },
        { type: 'dynamic', ids: ["storage.clearSelection"], label: "Exit Selection Mode" },
        { type: 'header', label: 'File Actions' },
        { type: 'dynamic', ids: ["storage.delete"] },
        { type: 'dynamic', ids: ["storage.rename"] },
    ],
    docs: [
        { type: 'header', label: 'General' },
        { type: 'dynamic', ids: ["docs.save"] },
        { type: 'dynamic', ids: ["docs.link"] },
        { type: 'dynamic', ids: ["docs.viewMode"] },
        { type: 'header', label: 'Formatting' },
        { type: 'dynamic', ids: ["docs.bold"] },
        { type: 'dynamic', ids: ["docs.italic"] },
        { type: 'dynamic', ids: ["docs.underline"] },
        { type: 'header', label: 'Paragraph' },
        { type: 'dynamic', ids: ["docs.alignLeft"] },
        { type: 'dynamic', ids: ["docs.alignCenter"] },
        { type: 'dynamic', ids: ["docs.alignRight"] },
        { type: 'dynamic', ids: ["docs.bulletList"] },
    ],
    graph: [
        { type: 'header', label: 'Edit' },
        { type: 'dynamic', ids: ["graph.newNode"] },
        { type: 'dynamic', ids: ["graph.delete"] },
        { type: 'header', label: 'View' },
        { type: 'dynamic', ids: ["graph.center"], label: "Fit View" },
        { type: 'dynamic', ids: ["graph.zoomIn"] },
        { type: 'dynamic', ids: ["graph.zoomOut"] },
        { type: 'dynamic', ids: ["graph.panUp", "graph.panDown", "graph.panLeft", "graph.panRight"], label: "Pan View" },
        { type: 'dynamic', ids: ["graph.panUpFast", "graph.panDownFast", "graph.panLeftFast", "graph.panRightFast"], label: "Fast Pan" },
    ],
    video: [
        { type: 'header', label: 'Playback' },
        { type: 'dynamic', ids: ["video.playPause"], extraKeys: [<Key key="k">K</Key>] },
        { type: 'dynamic', ids: ["video.seekBack10"] },
        { type: 'dynamic', ids: ["video.seekFwd10"] },
        { type: 'dynamic', ids: ["video.seekBack5"] },
        { type: 'dynamic', ids: ["video.seekFwd5"] },
        { type: 'header', label: 'Controls' },
        { type: 'dynamic', ids: ["video.mute"] },
        { type: 'dynamic', ids: ["video.volUp"] },
        { type: 'dynamic', ids: ["video.volDown"] },
        { type: 'dynamic', ids: ["video.fullscreen"] },
        { type: 'dynamic', ids: ["video.screenshot"] },
        { type: 'dynamic', ids: ["video.close"], extraKeys: [<Key key="bs">Backspace</Key>] },
    ],
    audio: [
        { type: 'header', label: 'Playback' },
        { type: 'dynamic', ids: ["audio.playPause"], extraKeys: [<Key key="k">K</Key>] },
        { type: 'dynamic', ids: ["audio.seekBack10"] },
        { type: 'dynamic', ids: ["audio.seekFwd10"] },
        { type: 'dynamic', ids: ["audio.seekBack5"] },
        { type: 'dynamic', ids: ["audio.seekFwd5"] },
        { type: 'header', label: 'Controls' },
        { type: 'dynamic', ids: ["audio.mute"] },
        { type: 'dynamic', ids: ["video.volUp"], label: "Volume Up" },
        { type: 'dynamic', ids: ["video.volDown"], label: "Volume Down" },
        { type: 'dynamic', ids: ["audio.close"], extraKeys: [<Key key="bs">Backspace</Key>] },
    ],
    pdf: [
        { type: 'header', label: 'Navigation' },
        { type: 'dynamic', ids: ["pdf.prevPage"] },
        { type: 'dynamic', ids: ["pdf.nextPage"] },
        { type: 'dynamic', ids: ["pdf.close"], extraKeys: [<Key key="bs">Backspace</Key>] },
        { type: 'header', label: 'View' },
        { type: 'dynamic', ids: ["pdf.zoomIn"] },
        { type: 'dynamic', ids: ["pdf.zoomOut"] },
        { type: 'header', label: 'Trackpad Gestures' },
        { type: 'custom', label: "Zoom View", icon: MagnifyingGlass, keys: [<Key key="shift">Shift</Key>, <span key="then" className="text-xs text-zinc-500">then</span>, <Key key="scroll">Scroll</Key>] },
        { type: 'custom', label: "Pan View", icon: CaretRight, keys: [<Key key="ctrl">Ctrl</Key>, <span key="then" className="text-xs text-zinc-500">then</span>, <Key key="scroll">Scroll</Key>] },
    ],
    image: [
        { type: 'header', label: 'View' },
        { type: 'dynamic', ids: ["image.zoomIn"] },
        { type: 'dynamic', ids: ["image.zoomOut"] },
        { type: 'dynamic', ids: ["image.resetZoom"] },
        { type: 'dynamic', ids: ["image.close"], extraKeys: [<Key key="bs">Backspace</Key>] },
    ]
};

export function ShortcutGuideDialog({ open, onOpenChange }: ShortcutGuideDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const { customKeybinds } = useStore();

    // Reset search when dialog opens/closes
    if (!open && searchQuery) setSearchQuery("");

    const filteredItems = useMemo(() => {
        if (!searchQuery) return [];
        const query = searchQuery.toLowerCase();
        
        const allItems: { item: GuideItem, category: string }[] = [];
        Object.entries(GUIDE_DATA).forEach(([category, items]) => {
            items.forEach(item => {
                if (item.type === 'header') return;
                allItems.push({ item, category });
            });
        });

        return allItems.filter(({ item }) => {
            if (item.type === 'custom') {
                return item.label.toLowerCase().includes(query);
            }
            if (item.type === 'dynamic') {
                // Check provided label
                if (item.label && item.label.toLowerCase().includes(query)) return true;
                
                // Check registry label/description/keys
                return item.ids.some(id => {
                    const def = KEYBIND_REGISTRY[id];
                    if (!def) return false;
                    if (def.label.toLowerCase().includes(query)) return true;
                    if (def.description && def.description.toLowerCase().includes(query)) return true;
                    
                    const currentKey = customKeybinds[id] || def.defaultKey;
                    if (currentKey.toLowerCase().includes(query)) return true;
                    
                    return false;
                });
            }
            return false;
        });
    }, [searchQuery, customKeybinds]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 flex flex-col max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CornersOut className="text-primary" size={24} />
                        Keyboard Shortcuts
                    </DialogTitle>
                    <DialogDescription>
                        Master Whistler with these keyboard commands.
                    </DialogDescription>
                    <div className="relative mt-2">
                        <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 w-3.5 h-3.5" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search shortcuts..."
                            className="pl-8 h-8 bg-zinc-900/50 border-zinc-800 focus:bg-zinc-900"
                        />
                    </div>
                </DialogHeader>

                {searchQuery ? (
                    <ScrollArea className="flex-1 -mx-6 px-6">
                        <div className="space-y-1 pb-4">
                            {filteredItems.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500 text-sm">
                                    No shortcuts found for "{searchQuery}"
                                </div>
                            ) : (
                                filteredItems.map((entry, i) => {
                                    const { item } = entry;
                                    if (item.type === 'custom') {
                                        return <ShortcutRow key={i} label={item.label} icon={item.icon} keys={item.keys} />;
                                    } else if (item.type === 'dynamic') {
                                        return (
                                            <DynamicShortcutRow 
                                                key={i} 
                                                ids={item.ids} 
                                                label={item.label} 
                                                extraKeys={item.extraKeys} 
                                            />
                                        );
                                    }
                                    return null;
                                })
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                    <Tabs defaultValue="global" className="flex-1 flex flex-col min-h-0">
                        <TabsList className="w-full justify-start bg-zinc-900 border-b border-zinc-800 rounded-none h-auto p-0 flex-wrap shrink-0">
                            {Object.keys(GUIDE_DATA).map(key => (
                                <TabsTrigger 
                                    key={key} 
                                    value={key} 
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 capitalize"
                                >
                                    {key}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <ScrollArea className="flex-1 -mx-6 px-6">
                            {Object.entries(GUIDE_DATA).map(([key, items]) => (
                                <TabsContent key={key} value={key} className="mt-0 py-4 space-y-1">
                                    {items.map((item, i) => {
                                        if (item.type === 'header') {
                                            return (
                                                <div key={i} className={`text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider ${i > 0 ? 'mt-6' : 'mt-1'}`}>
                                                    {item.label}
                                                </div>
                                            );
                                        }
                                        if (item.type === 'custom') {
                                            return <ShortcutRow key={i} label={item.label} icon={item.icon} keys={item.keys} />;
                                        }
                                        if (item.type === 'dynamic') {
                                            return (
                                                <DynamicShortcutRow 
                                                    key={i} 
                                                    ids={item.ids} 
                                                    label={item.label} 
                                                    extraKeys={item.extraKeys} 
                                                />
                                            );
                                        }
                                        return null;
                                    })}
                                </TabsContent>
                            ))}
                        </ScrollArea>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
