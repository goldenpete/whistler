import React, { type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CaretRight, CaretLeft, CornersOut, CornersIn, SpeakerHigh, Image, FilmStrip, FileText, House, Folder, Graph, MagnifyingGlass, Gear, HardDrives, Trash, PencilSimple, CaretUp, CheckSquare, X } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ShortcutGuideDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const Key = ({ children }: { children: ReactNode }) => (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold font-mono text-zinc-400 bg-zinc-800 border border-zinc-700 rounded shadow-[0_1px_0_rgba(0,0,0,0.2)] select-none uppercase">
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
                        <CornersOut className="text-primary" size={24} />
                        Keyboard Shortcuts
                    </DialogTitle>
                    <DialogDescription>
                        Master Whistler with these keyboard commands.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="global" className="w-full">
                    <TabsList className="w-full justify-start bg-zinc-900 border-b border-zinc-800 rounded-none h-auto p-0 flex-wrap">
                        <TabsTrigger value="global" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Global</TabsTrigger>
                        <TabsTrigger value="navigation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Navigation</TabsTrigger>
                        <TabsTrigger value="storage" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Storage</TabsTrigger>
                        <TabsTrigger value="docs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Docs</TabsTrigger>
                        <TabsTrigger value="graph" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Graph</TabsTrigger>
                        <TabsTrigger value="video" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Video</TabsTrigger>
                        <TabsTrigger value="audio" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Audio</TabsTrigger>
                        <TabsTrigger value="pdf" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">PDF</TabsTrigger>
                        <TabsTrigger value="image" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Image</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[60vh] p-4">
                        <TabsContent value="global" className="mt-0 space-y-1">
                            <ShortcutRow label="Show Shortcuts" icon={CornersOut} keys={[<Key>Shift</Key>, <Key>?</Key>]} />
                            <ShortcutRow label="Spotlight Search" icon={MagnifyingGlass} keys={[<Key>Ctrl</Key>, <Key>K</Key>]} />
                            <ShortcutRow label="Settings" icon={Gear} keys={[<Key>Ctrl</Key>, <Key>,</Key>]} />
                        </TabsContent>

                        <TabsContent value="navigation" className="mt-0 space-y-1">
                            <div className="text-xs font-medium text-zinc-500 mb-2 mt-1 uppercase tracking-wider">Go To...</div>
                            <ShortcutRow label="Home" icon={House} keys={[<Key>G</Key>, <span className="text-xs text-zinc-500">then</span>, <Key>H</Key>]} />
                            <ShortcutRow label="Storage" icon={HardDrives} keys={[<Key>G</Key>, <span className="text-xs text-zinc-500">then</span>, <Key>S</Key>]} />
                            <ShortcutRow label="Collections" icon={FileText} keys={[<Key>G</Key>, <span className="text-xs text-zinc-500">then</span>, <Key>C</Key>]} />
                            <ShortcutRow label="Docs" icon={FileText} keys={[<Key>G</Key>, <span className="text-xs text-zinc-500">then</span>, <Key>D</Key>]} />
                            <ShortcutRow label="Graphs" icon={Graph} keys={[<Key>G</Key>, <span className="text-xs text-zinc-500">then</span>, <Key>G</Key>]} />
                            
                            <div className="text-xs font-medium text-zinc-500 mb-2 mt-6 uppercase tracking-wider">Legacy</div>
                            <ShortcutRow label="Storage" icon={HardDrives} keys={[<Key>1</Key>]} />
                            <ShortcutRow label="Docs" icon={FileText} keys={[<Key>2</Key>]} />
                            <ShortcutRow label="Graphs" icon={Graph} keys={[<Key>3</Key>]} />
                            
                            <div className="text-xs font-medium text-zinc-500 mb-2 mt-6 uppercase tracking-wider">Document List</div>
                            <ShortcutRow label="Navigate Docs" icon={CaretRight} keys={[<Key>↑</Key>, <Key>↓</Key>]} />
                        </TabsContent>

                        <TabsContent value="storage" className="mt-0 space-y-1">
                            <ShortcutRow label="Navigate Items" icon={CaretRight} keys={[<Key>↑</Key>, <Key>↓</Key>, <Key>←</Key>, <Key>→</Key>]} />
                            <ShortcutRow label="Open Item" icon={CaretRight} keys={[<Key>Enter</Key>]} />
                            <ShortcutRow label="Select Item" icon={CheckSquare} keys={[<Key>Space</Key>]} />
                            <ShortcutRow label="Select All" icon={CheckSquare} keys={[<Key>Ctrl</Key>, <Key>A</Key>]} />
                            <ShortcutRow label="Delete Selection" icon={Trash} keys={[<Key>Delete</Key>]} />
                            <ShortcutRow label="Rename File" icon={PencilSimple} keys={[<Key>F2</Key>]} />
                            <ShortcutRow label="Go Up Directory" icon={CaretUp} keys={[<Key>Backspace</Key>]} />
                            <ShortcutRow label="Clear Selection" icon={CornersOut} keys={[<Key>Esc</Key>]} />
                        </TabsContent>

                        <TabsContent value="docs" className="mt-0 space-y-1">
                            <ShortcutRow label="Save Document" icon={FileText} keys={[<Key>Ctrl</Key>, <Key>S</Key>]} />
                            <ShortcutRow label="Insert Link" icon={FileText} keys={[<Key>Ctrl</Key>, <Key>K</Key>]} />
                            <ShortcutRow label="Bold" icon={FileText} keys={[<Key>Ctrl</Key>, <Key>B</Key>]} />
                            <ShortcutRow label="Italic" icon={FileText} keys={[<Key>Ctrl</Key>, <Key>I</Key>]} />
                            <ShortcutRow label="Underline" icon={FileText} keys={[<Key>Ctrl</Key>, <Key>U</Key>]} />
                            <ShortcutRow label="Align Left" icon={FileText} keys={[<Key>Ctrl</Key>, <Key>Shift</Key>, <Key>L</Key>]} />
                            <ShortcutRow label="Align Center" icon={FileText} keys={[<Key>Ctrl</Key>, <Key>Shift</Key>, <Key>E</Key>]} />
                            <ShortcutRow label="Align Right" icon={FileText} keys={[<Key>Ctrl</Key>, <Key>Shift</Key>, <Key>R</Key>]} />
                            <ShortcutRow label="Bullet List" icon={FileText} keys={[<Key>Ctrl</Key>, <Key>Shift</Key>, <Key>8</Key>]} />
                        </TabsContent>

                        <TabsContent value="graph" className="mt-0 space-y-1">
                            <ShortcutRow label="Add Node" icon={Graph} keys={[<Key>N</Key>]} />
                            <ShortcutRow label="Fit View" icon={CornersIn} keys={[<Key>Space</Key>]} />
                            <ShortcutRow label="Zoom In" icon={MagnifyingGlass} keys={[<Key>+</Key>, <span className="text-xs text-zinc-500">or</span>, <Key>=</Key>]} />
                            <ShortcutRow label="Zoom Out" icon={MagnifyingGlass} keys={[<Key>-</Key>]} />
                            <ShortcutRow label="Pan View" icon={CaretRight} keys={[<Key>↑</Key>, <Key>↓</Key>, <Key>←</Key>, <Key>→</Key>]} />
                            <ShortcutRow label="Fast Pan" icon={CaretRight} keys={[<Key>Shift</Key>, <Key>Arrows</Key>]} />
                            <ShortcutRow label="Delete Node" icon={Trash} keys={[<Key>Delete</Key>]} />
                        </TabsContent>

                        <TabsContent value="video" className="mt-0 space-y-1">
                            <ShortcutRow label="Play / Pause" icon={FilmStrip} keys={[<Key>Space</Key>, <span className="text-xs text-zinc-500">or</span>, <Key>K</Key>]} />
                            <ShortcutRow label="Fullscreen" icon={CornersOut} keys={[<Key>F</Key>]} />
                            <ShortcutRow label="Close Player" icon={X} keys={[<Key>Esc</Key>, <span className="text-xs text-zinc-500">or</span>, <Key>Backspace</Key>]} />
                            <ShortcutRow label="Mute / Unmute" icon={SpeakerHigh} keys={[<Key>M</Key>]} />
                            <ShortcutRow label="Volume Up" icon={SpeakerHigh} keys={[<Key>↑</Key>]} />
                            <ShortcutRow label="Volume Down" icon={SpeakerHigh} keys={[<Key>↓</Key>]} />
                            <ShortcutRow label="Seek Backward 10s" icon={CaretLeft} keys={[<Key>J</Key>]} />
                            <ShortcutRow label="Seek Forward 10s" icon={CaretRight} keys={[<Key>L</Key>]} />
                            <ShortcutRow label="Seek Backward 5s" icon={CaretLeft} keys={[<Key>←</Key>]} />
                            <ShortcutRow label="Seek Forward 5s" icon={CaretRight} keys={[<Key>→</Key>]} />
                            <ShortcutRow label="Take Screenshot" icon={Image} keys={[<Key>S</Key>]} />
                        </TabsContent>

                        <TabsContent value="audio" className="mt-0 space-y-1">
                            <ShortcutRow label="Play / Pause" icon={FilmStrip} keys={[<Key>Space</Key>, <span className="text-xs text-zinc-500">or</span>, <Key>K</Key>]} />
                            <ShortcutRow label="Close Player" icon={X} keys={[<Key>Esc</Key>, <span className="text-xs text-zinc-500">or</span>, <Key>Backspace</Key>]} />
                            <ShortcutRow label="Mute / Unmute" icon={SpeakerHigh} keys={[<Key>M</Key>]} />
                            <ShortcutRow label="Volume Up" icon={SpeakerHigh} keys={[<Key>↑</Key>]} />
                            <ShortcutRow label="Volume Down" icon={SpeakerHigh} keys={[<Key>↓</Key>]} />
                            <ShortcutRow label="Seek Backward 10s" icon={CaretLeft} keys={[<Key>J</Key>]} />
                            <ShortcutRow label="Seek Forward 10s" icon={CaretRight} keys={[<Key>L</Key>]} />
                            <ShortcutRow label="Seek Backward 5s" icon={CaretLeft} keys={[<Key>←</Key>]} />
                            <ShortcutRow label="Seek Forward 5s" icon={CaretRight} keys={[<Key>→</Key>]} />
                        </TabsContent>

                        <TabsContent value="pdf" className="mt-0 space-y-1">
                            <ShortcutRow label="Previous Page" icon={CaretLeft} keys={[<Key>←</Key>]} />
                            <ShortcutRow label="Next Page" icon={CaretRight} keys={[<Key>→</Key>]} />
                            <ShortcutRow label="Zoom In" icon={MagnifyingGlass} keys={[<Key>+</Key>, <span className="text-xs text-zinc-500">or</span>, <Key>=</Key>]} />
                            <ShortcutRow label="Zoom Out" icon={MagnifyingGlass} keys={[<Key>-</Key>]} />
                            <ShortcutRow label="Close Viewer" icon={X} keys={[<Key>Esc</Key>, <span className="text-xs text-zinc-500">or</span>, <Key>Backspace</Key>]} />
                            
                            <div className="text-xs font-medium text-zinc-500 mb-2 mt-6 uppercase tracking-wider">Trackpad Gestures</div>
                            <ShortcutRow label="Zoom View" icon={MagnifyingGlass} keys={[<Key>Shift</Key>, <span className="text-xs text-zinc-500">then</span>, <Key>Scroll</Key>]} />
                            <ShortcutRow label="Pan View" icon={CaretRight} keys={[<Key>Ctrl</Key>, <span className="text-xs text-zinc-500">then</span>, <Key>Scroll</Key>]} />
                        </TabsContent>

                        <TabsContent value="image" className="mt-0 space-y-1">
                            <ShortcutRow label="Zoom In" icon={MagnifyingGlass} keys={[<Key>+</Key>, <span className="text-xs text-zinc-500">or</span>, <Key>=</Key>]} />
                            <ShortcutRow label="Zoom Out" icon={MagnifyingGlass} keys={[<Key>-</Key>]} />
                            <ShortcutRow label="Reset Zoom" icon={CornersIn} keys={[<Key>0</Key>]} />
                            <ShortcutRow label="Close Viewer" icon={X} keys={[<Key>Esc</Key>, <span className="text-xs text-zinc-500">or</span>, <Key>Backspace</Key>]} />
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
