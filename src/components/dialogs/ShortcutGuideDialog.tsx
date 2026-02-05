import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Keyboard, Command, ArrowRight, ArrowLeft, CornersOut, SpeakerHigh, Image, FilmStrip, Files, House, Folder, FileText, Graph, MagnifyingGlass, Gear, HardDrives, Trash, PencilSimple, SelectionAll, ArrowUUpLeft } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ShortcutGuideDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const Key = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold font-mono text-zinc-400 bg-zinc-800 border border-zinc-700 rounded shadow-[0_1px_0_rgba(0,0,0,0.2)] select-none uppercase">
        {children}
    </span>
);

const ShortcutRow = ({ label, keys, icon: Icon }: { label: string, keys: React.ReactNode[], icon?: any }) => (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
        <div className="flex items-center gap-3">
            {Icon && <Icon className="text-zinc-400" size={16} />}
            <span className="text-sm text-zinc-300">{label}</span>
        </div>
        <div className="flex items-center gap-1">
            {keys.map((k, i) => (
                <div key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-zinc-600 text-xs">+</span>}
                    {k}
                </div>
            ))}
        </div>
    </div>
);

export function ShortcutGuideDialog({ open, onOpenChange }: ShortcutGuideDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard className="text-primary" size={24} />
                        Keyboard Shortcuts
                    </DialogTitle>
                    <DialogDescription>
                        Master Whistler with these keyboard commands.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="global" className="w-full">
                    <TabsList className="w-full justify-start bg-zinc-900 border-b border-zinc-800 rounded-none h-auto p-0">
                        <TabsTrigger value="global" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Global</TabsTrigger>
                        <TabsTrigger value="navigation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Navigation</TabsTrigger>
                        <TabsTrigger value="storage" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Storage</TabsTrigger>
                        <TabsTrigger value="player" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Media Player</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[400px] p-4">
                        <TabsContent value="global" className="mt-0 space-y-1">
                            <ShortcutRow label="Show Shortcuts" icon={Keyboard} keys={[<Key>Shift</Key>, <Key>?</Key>]} />
                            <ShortcutRow label="Spotlight Search" icon={MagnifyingGlass} keys={[<Key>Ctrl</Key>, <Key>K</Key>]} />
                            <ShortcutRow label="Settings" icon={Gear} keys={[<Key>Ctrl</Key>, <Key>,</Key>]} />
                        </TabsContent>

                        <TabsContent value="navigation" className="mt-0 space-y-1">
                            <div className="text-xs font-medium text-zinc-500 mb-2 mt-1 uppercase tracking-wider">Go To...</div>
                            <ShortcutRow label="Home" icon={House} keys={[<Key>G</Key>, <span className="text-xs text-zinc-500">then</span>, <Key>H</Key>]} />
                            <ShortcutRow label="Storage" icon={HardDrives} keys={[<Key>G</Key>, <span className="text-xs text-zinc-500">then</span>, <Key>S</Key>]} />
                            <ShortcutRow label="Collections" icon={Files} keys={[<Key>G</Key>, <span className="text-xs text-zinc-500">then</span>, <Key>C</Key>]} />
                            <ShortcutRow label="Docs" icon={FileText} keys={[<Key>G</Key>, <span className="text-xs text-zinc-500">then</span>, <Key>D</Key>]} />
                            <ShortcutRow label="Graphs" icon={Graph} keys={[<Key>G</Key>, <span className="text-xs text-zinc-500">then</span>, <Key>G</Key>]} />
                            
                            <div className="text-xs font-medium text-zinc-500 mb-2 mt-6 uppercase tracking-wider">Legacy</div>
                            <ShortcutRow label="Storage" icon={HardDrives} keys={[<Key>1</Key>]} />
                            <ShortcutRow label="Docs" icon={FileText} keys={[<Key>2</Key>]} />
                            <ShortcutRow label="Graphs" icon={Graph} keys={[<Key>3</Key>]} />
                            
                            <div className="text-xs font-medium text-zinc-500 mb-2 mt-6 uppercase tracking-wider">Document List</div>
                            <ShortcutRow label="Previous Doc" icon={ArrowLeft} keys={[<Key>Alt</Key>, <Key>↑</Key>]} />
                            <ShortcutRow label="Next Doc" icon={ArrowRight} keys={[<Key>Alt</Key>, <Key>↓</Key>]} />
                        </TabsContent>

                        <TabsContent value="storage" className="mt-0 space-y-1">
                            <ShortcutRow label="Navigate Items" icon={ArrowRight} keys={[<Key>↑</Key>, <Key>↓</Key>, <Key>←</Key>, <Key>→</Key>]} />
                            <ShortcutRow label="Open Item" icon={ArrowRight} keys={[<Key>Enter</Key>]} />
                            <ShortcutRow label="Select All" icon={SelectionAll} keys={[<Key>Ctrl</Key>, <Key>A</Key>]} />
                            <ShortcutRow label="Delete Selection" icon={Trash} keys={[<Key>Delete</Key>]} />
                            <ShortcutRow label="Rename File" icon={PencilSimple} keys={[<Key>F2</Key>]} />
                            <ShortcutRow label="Go Up Directory" icon={ArrowUUpLeft} keys={[<Key>Backspace</Key>]} />
                            <ShortcutRow label="Clear Selection" icon={CornersOut} keys={[<Key>Esc</Key>]} />
                        </TabsContent>

                        <TabsContent value="player" className="mt-0 space-y-1">
                            <ShortcutRow label="Play / Pause" icon={FilmStrip} keys={[<Key>Space</Key>, <span className="text-xs text-zinc-500">or</span>, <Key>K</Key>]} />
                            <ShortcutRow label="Fullscreen" icon={CornersOut} keys={[<Key>F</Key>]} />
                            <ShortcutRow label="Mute / Unmute" icon={SpeakerHigh} keys={[<Key>M</Key>]} />
                            <ShortcutRow label="Volume Up" icon={SpeakerHigh} keys={[<Key>↑</Key>]} />
                            <ShortcutRow label="Volume Down" icon={SpeakerHigh} keys={[<Key>↓</Key>]} />
                            <ShortcutRow label="Seek Backward 10s" icon={ArrowLeft} keys={[<Key>J</Key>]} />
                            <ShortcutRow label="Seek Forward 10s" icon={ArrowRight} keys={[<Key>L</Key>]} />
                            <ShortcutRow label="Seek Backward 5s" icon={ArrowLeft} keys={[<Key>←</Key>]} />
                            <ShortcutRow label="Seek Forward 5s" icon={ArrowRight} keys={[<Key>→</Key>]} />
                            <ShortcutRow label="Take Screenshot" icon={Image} keys={[<Key>S</Key>]} />
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
