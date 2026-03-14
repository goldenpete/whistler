/**
 * ─── DoubleTapMenu.tsx ─────────────────────────────────────────────
 *
 * Quick-access navigation overlay triggered by a double-tap gesture
 * (Shift+Shift), presenting a compact alt-tab style switcher.
 *
 * Features:
 *   - Horizontal strip switcher, keyboard navigable
 *   - Arrow keys to move, Enter to confirm, Esc to dismiss
 *   - Pre-selects the currently active route
 *   - Framer Motion entrance/exit animations
 *
 * Exports: DoubleTapMenu component
 * Related: GlobalKeybinds (trigger), useStore (open/close state)
 * ───────────────────────────────────────────────────────────────────
 */
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { HardDrives, FileText, Graph, House, Folders } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

const menuItems = [
    { id: 'home',        label: 'Home',       icon: House,      path: '/',            shortcut: 'G+H' },
    { id: 'collections', label: 'Collections', icon: Folders,    path: '/collections', shortcut: 'G+C' },
    { id: 'storage',     label: 'Storage',     icon: HardDrives, path: '/storage',     shortcut: 'G+S' },
    { id: 'docs',        label: 'Documents',   icon: FileText,   path: '/docs',        shortcut: 'G+D' },
    { id: 'graphs',      label: 'Graphs',      icon: Graph,      path: '/graphs',      shortcut: 'G+G' },
];

export function DoubleTapMenu() {
    const { isDoubleTapMenuOpen, setDoubleTapMenuOpen } = useStore(useShallow((state) => ({
        isDoubleTapMenuOpen: state.isDoubleTapMenuOpen,
        setDoubleTapMenuOpen: state.setDoubleTapMenuOpen,
    })));
    const navigate = useNavigate();
    const location = useLocation();

    const getActiveIndex = useCallback(() => {
        const idx = menuItems.findIndex(item =>
            item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
        );
        return idx >= 0 ? idx : 0;
    }, [location.pathname]);

    const [selectedIndex, setSelectedIndex] = useState(getActiveIndex);
    const selectedIndexRef = useRef(selectedIndex);

    useEffect(() => { selectedIndexRef.current = selectedIndex; }, [selectedIndex]);

    useEffect(() => {
        if (isDoubleTapMenuOpen) setSelectedIndex(getActiveIndex());
    }, [isDoubleTapMenuOpen, getActiveIndex]);

    const handleNavigate = useCallback((path: string) => {
        navigate(path);
        setDoubleTapMenuOpen(false);
    }, [navigate, setDoubleTapMenuOpen]);

    useEffect(() => {
        if (!isDoubleTapMenuOpen) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'Shift') {
                e.preventDefault();
                e.stopPropagation();
                setSelectedIndex(prev => (prev + 1) % menuItems.length);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                setSelectedIndex(prev => (prev - 1 + menuItems.length) % menuItems.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleNavigate(menuItems[selectedIndexRef.current].path);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setDoubleTapMenuOpen(false);
            }
        };

        window.addEventListener('keydown', onKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
    }, [isDoubleTapMenuOpen, handleNavigate, setDoubleTapMenuOpen]);

    return (
        <AnimatePresence>
            {isDoubleTapMenuOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                        onClick={() => setDoubleTapMenuOpen(false)}
                    />

                    {/* Switcher strip */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 6 }}
                            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                            className="pointer-events-auto flex flex-col items-center gap-2.5"
                        >
                            <div className="flex items-stretch gap-px p-1 rounded-none bg-black border border-white/[0.08] shadow-2xl shadow-black backdrop-blur-2xl">
                                {menuItems.map((item, index) => {
                                    const isSelected = selectedIndex === index;
                                    const isActive = getActiveIndex() === index;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleNavigate(item.path)}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            style={isSelected ? {
                                                background: 'var(--primary)',
                                                color: 'var(--primary-foreground)',
                                            } : {}}
                                            className={cn(
                                                "relative flex flex-col items-center gap-2.5 px-7 py-4 rounded-none transition-all duration-100 min-w-[96px] outline-none select-none",
                                                isSelected
                                                    ? ""
                                                    : "text-zinc-300 hover:text-white hover:bg-white/[0.05]"
                                            )}
                                        >
                                            {/* Top accent bar for selected */}
                                            {isSelected && (
                                                <span className="absolute top-0 inset-x-0 h-[2px]" style={{ background: 'var(--primary-foreground)', opacity: 0.25 }} />
                                            )}
                                            <item.icon
                                                size={24}
                                                weight={isSelected ? "regular" : "thin"}
                                                className="transition-all duration-100 shrink-0"
                                            />
                                            <span className={cn(
                                                "text-[11px] font-medium tracking-widest uppercase leading-none transition-colors duration-100",
                                                isSelected ? "opacity-100" : "text-zinc-300"
                                            )}>
                                                {item.label}
                                            </span>
                                            <span className={cn(
                                                "text-[10px] font-mono leading-none transition-colors duration-100",
                                                isSelected ? "opacity-60" : "text-zinc-400"
                                            )}>
                                                {item.shortcut}
                                            </span>
                                            {/* Active route dot */}
                                            {isActive && (
                                                <span
                                                    className="absolute bottom-[7px] left-1/2 -translate-x-1/2 w-1 h-1"
                                                    style={isSelected
                                                        ? { background: 'var(--primary-foreground)', opacity: 0.5 }
                                                        : { background: 'var(--primary)' }}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <p className="text-[10px] text-zinc-500 font-mono tracking-[0.15em]">
                                ← →&nbsp;&nbsp;navigate &nbsp;·&nbsp; ↵&nbsp;&nbsp;open &nbsp;·&nbsp; esc&nbsp;&nbsp;close
                            </p>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
