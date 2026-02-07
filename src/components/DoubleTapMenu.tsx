import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { HardDrives, FileText, Graph, ArrowRight, House, Folders } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function DoubleTapMenu() {
    const { isDoubleTapMenuOpen, setDoubleTapMenuOpen } = useStore();
    const navigate = useNavigate();

    const menuItems = [
        {
            id: 'home',
            label: 'Home',
            icon: House,
            path: '/',
            description: 'Dashboard & Overview',
            shortcut: 'G + H'
        },
        {
            id: 'collections',
            label: 'Collections',
            icon: Folders,
            path: '/collections',
            description: 'Organize your media',
            shortcut: 'G + C'
        },
        {
            id: 'storage',
            label: 'Storage',
            icon: HardDrives,
            path: '/storage',
            description: 'File system access',
            shortcut: 'G + S'
        },
        {
            id: 'docs',
            label: 'Documents',
            icon: FileText,
            path: '/docs',
            description: 'Notes & Documentation',
            shortcut: 'G + D'
        },
        {
            id: 'graphs',
            label: 'Graphs',
            icon: Graph,
            path: '/graphs',
            description: 'Node visualizations',
            shortcut: 'G + G'
        }
    ];

    const handleNavigate = (path: string) => {
        navigate(path);
        setDoubleTapMenuOpen(false);
    };

    return (
        <Dialog open={isDoubleTapMenuOpen} onOpenChange={setDoubleTapMenuOpen}>
            <DialogContent 
                showCloseButton={false} 
                className="w-full max-w-5xl sm:max-w-5xl bg-transparent border-none shadow-none p-0 outline-none ring-0 focus:ring-0 data-[state=open]:ring-0"
            >
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 p-4">
                    {menuItems.map((item, index) => (
                        <motion.button
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleNavigate(item.path)}
                            className={cn(
                                "flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-200 group text-center h-56",
                                "bg-zinc-950/80 backdrop-blur-md border-zinc-800/50",
                                "hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-2xl hover:scale-105",
                                "focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-zinc-900"
                            )}
                        >
                            <div className="mb-6 text-zinc-400 group-hover:text-white transition-colors duration-300">
                                <item.icon size={42} weight="thin" />
                            </div>
                            
                            <h3 className="text-lg font-medium text-zinc-200 group-hover:text-white mb-2 tracking-tight">
                                {item.label}
                            </h3>
                            
                            <p className="text-xs text-zinc-500 group-hover:text-zinc-400 mb-6 leading-relaxed px-2">
                                {item.description}
                            </p>

                            <div className="mt-auto px-2.5 py-1 rounded-md bg-zinc-900/50 border border-zinc-800/50 text-[10px] font-mono text-zinc-500 group-hover:border-zinc-600 group-hover:text-zinc-400 transition-colors">
                                {item.shortcut}
                            </div>
                        </motion.button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
