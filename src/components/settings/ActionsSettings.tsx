import { useState } from "react";
import { ACTION_REGISTRY } from "@/lib/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MagnifyingGlass, CaretRight, Lightning } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// Helper to categorize
const getCategory = (id: string) => {
    const prefix = id.split('.')[0];
    switch (prefix) {
        case 'create': return 'Creation';
        case 'graph': return 'Graph';
        case 'media': return 'Video';
        case 'pdf': return 'PDF';
        case 'image': return 'Image';
        case 'audio': return 'Audio';
        case 'ui': return 'System';
        default: return 'Other';
    }
};

const CATEGORIES = Array.from(new Set(ACTION_REGISTRY.map(a => getCategory(a.id)))).sort();

export function ActionsSettings() {
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

    // Group actions
    const groupedActions = ACTION_REGISTRY.reduce((acc, action) => {
        const cat = getCategory(action.id);
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(action);
        return acc;
    }, {} as Record<string, typeof ACTION_REGISTRY>);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between gap-4 relative">
                 <div className="flex-1">
                    <div className="relative w-full max-w-sm">
                        <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 w-3.5 h-3.5" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search actions..."
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
                            {CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-6">
                {CATEGORIES.filter(c => selectedCategory === "All" || c === selectedCategory).map(category => {
                    const items = groupedActions[category]?.filter(item => {
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                            item.labels.some(l => l.toLowerCase().includes(query)) ||
                            item.description.toLowerCase().includes(query) ||
                            item.id.toLowerCase().includes(query)
                        );
                    });

                    if (!items || items.length === 0) return null;
                    const isCollapsed = collapsedCategories.includes(category);

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
                                        const Icon = item.icon || Lightning;
                                        return (
                                            <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-md bg-zinc-800 text-zinc-400">
                                                        <Icon size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-zinc-200">
                                                            {item.labels[0]}
                                                        </span>
                                                        <span className="text-xs text-zinc-500">{item.description}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-4">
                                                    <code className="text-[10px] text-zinc-600 font-mono px-2 py-1 bg-zinc-950 rounded border border-zinc-900">
                                                        {item.id}
                                                    </code>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
