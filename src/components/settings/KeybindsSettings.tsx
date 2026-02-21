/**
 * ─── KeybindsSettings.tsx ────────────────────────────────────────────────────
 *
 * Keybind customization UI in the Settings view.
 *
 * Features:
 *   - Lists all registered keyboard shortcuts grouped by category
 *   - Click-to-edit remapping (captures next key combination)
 *   - Conflict detection (warns when two actions share a key)
 *   - Import/Export keybind configurations as JSON
 *   - Reset individual or all keybinds to defaults
 *   - Enable/disable individual keybinds
 *   - Search/filter by action name or key
 *
 * Data flow:
 *   Reads KEYBIND_REGISTRY for defaults,
 *   reads/writes customKeybinds + disabledKeybinds from the store.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { KEYBIND_REGISTRY, KEYBIND_CATEGORIES, type KeybindDefinition } from "@/constants/keybinds";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/toggle-switch";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PencilSimple, ArrowCounterClockwise, Warning, DownloadSimple, Keyboard, MagnifyingGlass, CaretRight } from "@phosphor-icons/react";
import { cn, formatKey } from "@/lib/utils";

const KeyDisplay = ({ k }: { k: string }) => {
    if (!k) return null;
    const parts = k.split('+');
    return (
        <div className="flex items-center gap-1">
            {parts.map((part, i) => (
                <div key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-zinc-600 text-xs">+</span>}
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold font-mono text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-none shadow-[0_1px_0_rgba(0,0,0,0.2)] select-none uppercase whitespace-nowrap">
                        {formatKey(part)}
                    </span>
                </div>
            ))}
        </div>
    );
};

export function KeybindsSettings() {
    const { customKeybinds, disabledKeybinds, setKeybind, toggleKeybind, resetKeybinds } = useStore(useShallow((state) => ({
        customKeybinds: state.customKeybinds,
        disabledKeybinds: state.disabledKeybinds,
        setKeybind: state.setKeybind,
        toggleKeybind: state.toggleKeybind,
        resetKeybinds: state.resetKeybinds,
    })));
    const [editingId, setEditingId] = useState<string | null>(null);
    const [capturedKey, setCapturedKey] = useState<string>("");
    const [conflictId, setConflictId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);

    const toggleCategory = (category: string) => {
        setCollapsedCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleStartEditing = (id: string) => {
        setEditingId(id);
        const current = customKeybinds[id] || KEYBIND_REGISTRY[id].defaultKey;
        setCapturedKey(current);
        setConflictId(null);
    };

    const handleSave = () => {
        if (editingId && capturedKey) {
            setKeybind(editingId, capturedKey);
            setEditingId(null);
        }
    };

    const handleExport = () => {
        const data = {
            customKeybinds,
            disabledKeybinds,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'whistler-keybinds.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        if (!editingId) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Ignore just modifier key presses
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

            const modifiers = [];
            if (e.ctrlKey) modifiers.push('ctrl');
            if (e.altKey) modifiers.push('alt');
            if (e.shiftKey) modifiers.push('shift');
            if (e.metaKey) modifiers.push('meta');

            let key = e.key.toLowerCase();
            if (key === ' ') key = 'space';
            
            // Handle arrow keys and other special keys mapping if needed
            // But usually e.key gives "ArrowUp", etc.
            
            const keyString = [...modifiers, key].join('+');
            setCapturedKey(keyString);

            // Check conflict
            const conflict = Object.values(KEYBIND_REGISTRY).find(def => {
                const currentKey = customKeybinds[def.id] || def.defaultKey;
                // Conflict if same key, different ID, and that ID is not disabled
                return currentKey === keyString && def.id !== editingId && !disabledKeybinds.includes(def.id);
            });

            setConflictId(conflict ? conflict.id : null);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingId, customKeybinds, disabledKeybinds]);

    const editingDef = editingId ? KEYBIND_REGISTRY[editingId] : null;
    const conflictDef = conflictId ? KEYBIND_REGISTRY[conflictId] : null;

    const showShortcutsKey = customKeybinds["global.showShortcuts"] || KEYBIND_REGISTRY["global.showShortcuts"]?.defaultKey || "Shift+?";

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between gap-4 relative">
                <div className="flex-1">
                    <div className="relative w-full max-w-sm">
                        <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 w-3.5 h-3.5" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search shortcuts..."
                            className="pl-8 h-7 text-xs bg-zinc-900/50 border-zinc-800 focus:bg-zinc-900"
                        />
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-[140px] h-7 text-xs bg-zinc-900/50 border-zinc-800 focus:bg-zinc-900">
                            <SelectValue placeholder="Filter category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Categories</SelectItem>
                            {KEYBIND_CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={resetKeybinds}>
                        <ArrowCounterClockwise className="mr-2 h-4 w-4" />
                        Reset Defaults
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <DownloadSimple className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            <div className="space-y-6">
                {KEYBIND_CATEGORIES.filter(c => selectedCategory === "All" || c === selectedCategory).map(category => {
                    const items = Object.values(KEYBIND_REGISTRY).filter(item => {
                        if (item.category !== category) return false;
                        if (!searchQuery) return true;
                        
                        const query = searchQuery.toLowerCase();
                        return (
                            item.label.toLowerCase().includes(query) || 
                            (item.description && item.description.toLowerCase().includes(query)) ||
                            (customKeybinds[item.id] || item.defaultKey).toLowerCase().includes(query)
                        );
                    });
                    
                    const isCollapsed = collapsedCategories.includes(category);

                    if (items.length === 0) return null;

                    return (
                        <div key={category} className="space-y-3">
                            <button 
                                onClick={() => toggleCategory(category)}
                                className="flex items-center gap-2 text-sm font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
                            >
                                <CaretRight size={14} weight="bold" className={cn("transition-transform duration-200", !isCollapsed && "rotate-90")} />
                                {category}
                            </button>

                            {!isCollapsed && (
                                <div className="grid gap-2 animate-in slide-in-from-top-2 duration-200">
                                    {items.map(item => {
                                        const isDisabled = disabledKeybinds.includes(item.id);
                                        const currentKey = customKeybinds[item.id] || item.defaultKey;
                                        const Icon = item.icon || Keyboard;

                                        return (
                                            <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-none border border-zinc-800 hover:border-zinc-700 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("p-2 rounded-none bg-zinc-800 text-zinc-400", isDisabled && "opacity-50")}>
                                                        <Icon size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={cn("text-sm font-medium text-zinc-200", isDisabled && "text-zinc-500 line-through")}>
                                                            {item.label}
                                                        </span>
                                                        {item.description && (
                                                            <span className="text-xs text-zinc-500">{item.description}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("flex items-center gap-2", isDisabled && "opacity-50")}>
                                                        <KeyDisplay k={currentKey} />
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-zinc-500 hover:text-zinc-300"
                                                            onClick={() => handleStartEditing(item.id)}
                                                            disabled={isDisabled}
                                                        >
                                                            <PencilSimple size={14} />
                                                        </Button>
                                                    </div>
                                                    <Switch 
                                                        checked={!isDisabled}
                                                        onCheckedChange={(checked) => toggleKeybind(item.id, checked)}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-center pt-8 pb-4 text-center">
                <p className="text-xs text-zinc-500">
                    Press <span className="inline-flex items-center justify-center h-4 px-1 text-[10px] font-bold font-mono text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-none mx-0.5">{showShortcutsKey.replace('shift+?', '?')}</span> to view keyboard shortcuts at any time.
                </p>
            </div>

            <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
                <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800">
                    <DialogHeader>
                        <DialogTitle>Edit Shortcut</DialogTitle>
                        <DialogDescription>
                            Press the desired key combination for <span className="text-zinc-200 font-medium">{editingDef?.label}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                        <div className="p-6 bg-zinc-900 rounded-none border border-zinc-800 min-w-[200px] flex justify-center">
                            {capturedKey ? (
                                <KeyDisplay k={capturedKey} />
                            ) : (
                                <span className="text-zinc-500 text-sm">Press keys...</span>
                            )}
                        </div>
                        
                        {conflictDef && (
                            <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-3 py-2 rounded-none text-sm">
                                <Warning size={16} />
                                <span>Conflicts with: <strong>{conflictDef.label}</strong></span>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!capturedKey || (!!conflictDef)}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
