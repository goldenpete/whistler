import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { HardDrives, FileText, Graph, ArrowRight } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function DoubleTapMenu() {
    const { isDoubleTapMenuOpen, setDoubleTapMenuOpen } = useStore();
    const navigate = useNavigate();

    const menuItems = [
        {
            id: 'storage',
            label: 'Storage',
            icon: HardDrives,
            path: '/storage',
            description: 'Manage your files and folders',
            color: 'text-blue-400',
            bg: 'bg-blue-400/10',
            border: 'border-blue-400/20'
        },
        {
            id: 'docs',
            label: 'Documents',
            icon: FileText,
            path: '/docs',
            description: 'Write and edit documents',
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
            border: 'border-emerald-400/20'
        },
        {
            id: 'graphs',
            label: 'Graphs',
            icon: Graph,
            path: '/graphs',
            description: 'Visualize connections and nodes',
            color: 'text-violet-400',
            bg: 'bg-violet-400/10',
            border: 'border-violet-400/20'
        }
    ];

    const handleNavigate = (path: string) => {
        navigate(path);
        setDoubleTapMenuOpen(false);
    };

    return (
        <Dialog open={isDoubleTapMenuOpen} onOpenChange={setDoubleTapMenuOpen}>
            <DialogContent className="max-w-4xl bg-transparent border-none shadow-none p-0 outline-none">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
                    {menuItems.map((item, index) => (
                        <motion.button
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => handleNavigate(item.path)}
                            className={cn(
                                "flex flex-col items-start p-6 rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] group text-left",
                                "bg-zinc-950/90 hover:bg-zinc-900/90",
                                item.border
                            )}
                        >
                            <div className={cn("p-3 rounded-xl mb-4", item.bg, item.color)}>
                                <item.icon size={32} weight="duotone" />
                            </div>
                            
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                                {item.label}
                            </h3>
                            
                            <p className="text-sm text-zinc-400 mb-6 flex-1">
                                {item.description}
                            </p>

                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 group-hover:text-white transition-colors">
                                <span>Open</span>
                                <ArrowRight weight="bold" />
                            </div>
                        </motion.button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
