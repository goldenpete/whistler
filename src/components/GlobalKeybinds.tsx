import { useState, useEffect, useRef } from "react";
import { useKeybind } from "@/hooks/use-keybind";
import { useNavigate, useLocation } from "react-router-dom";
import { ShortcutGuideDialog } from "@/components/dialogs/ShortcutGuideDialog";
import { useStore } from "@/store/useStore";
import { KEYBIND_REGISTRY } from "@/constants/keybinds";

/**
 * Global keyboard shortcuts configuration.
 * These are application-wide keybinds that work regardless of the current view.
 */
export function GlobalKeybinds() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showGuide, setShowGuide] = useState(false);
    
    // Sequence state
    const lastKeyTime = useRef<number>(0);
    const lastKey = useRef<string | null>(null);
    const lastShiftTime = useRef<number>(0);
    const lastCleanShiftUpTime = useRef<number>(0);
    const currentPressDirty = useRef<boolean>(false);

    const { 
        toggleSidebar, toggleSidebarCollapse, isSidebarOpen, setSidebarView, 
        setDoubleTapMenuOpen, isDoubleTapMenuOpen,
        customKeybinds, disabledKeybinds
    } = useStore();

    const handleNavigation = (path: string, targetView: 'storage' | 'docs' | 'graphs' | 'main') => {
        navigate(path);
        const currentView = useStore.getState().sidebarView;
        const isDoubleTapOpen = ['storage', 'docs', 'graphs'].includes(currentView);
        
        if (isDoubleTapOpen) {
            setSidebarView(targetView);
        }
    };

    // --- Global Shortcuts ---
    useKeybind("global.showShortcuts", () => setShowGuide(prev => !prev), { preventDefault: true });
    
    // Settings
    useKeybind("global.settings", () => navigate("/settings"), { preventDefault: true });

    // Toggle Sidebar
    useKeybind("global.toggleSidebar", () => {
        if (location.pathname.includes('/file/')) {
            toggleSidebar(!isSidebarOpen);
        } else {
            toggleSidebarCollapse();
        }
    }, { preventDefault: true });

    // --- Navigation Shortcuts (Single Key / Custom) ---
    // Note: These useKeybind calls handle cases where the user has customized the key to a single chord,
    // OR if it's one of the ".num" legacy shortcuts which are single keys by default.
    // If it's a sequence default (e.g. g+h), useKeybind won't trigger unless customized to simple key.
    
    useKeybind("nav.storage", () => handleNavigation("/storage", "storage"), { preventDefault: true, disableInInput: true });
    useKeybind("nav.storage.num", () => handleNavigation("/storage", "storage"), { preventDefault: true, disableInInput: true });
    
    useKeybind("nav.docs", () => handleNavigation("/docs", "docs"), { preventDefault: true, disableInInput: true });
    useKeybind("nav.docs.num", () => handleNavigation("/docs", "docs"), { preventDefault: true, disableInInput: true });

    useKeybind("nav.graphs", () => handleNavigation("/graphs", "graphs"), { preventDefault: true, disableInInput: true });
    useKeybind("nav.graphs.num", () => handleNavigation("/graphs", "graphs"), { preventDefault: true, disableInInput: true });

    useKeybind("nav.collections", () => handleNavigation("/collections", "main"), { preventDefault: true, disableInInput: true });
    useKeybind("nav.collections.num", () => handleNavigation("/collections", "main"), { preventDefault: true, disableInInput: true });

    useKeybind("nav.home", () => handleNavigation("/", "main"), { preventDefault: true, disableInInput: true });
    useKeybind("nav.home.num", () => handleNavigation("/", "main"), { preventDefault: true, disableInInput: true });

    // Double Tap Menu (Customized Case)
    useKeybind("global.doubleTapMenu", () => setDoubleTapMenuOpen(!isDoubleTapMenuOpen));

    // --- Sequence Handler (G + Key) & Double Shift ---
    useEffect(() => {
        // Build dynamic map of G-sequences from registry + custom keybinds
        const gSequences: Record<string, string> = {};
        
        Object.values(KEYBIND_REGISTRY).forEach(def => {
            // We only care about navigation sequences that default to starting with g+
            // or if the user explicitly set a custom keybind that starts with g+
            if (!def.isSequence && !customKeybinds[def.id]) return;

            const effectiveKey = customKeybinds[def.id] || def.defaultKey;
            const parts = effectiveKey.toLowerCase().split('+').map(p => p.trim());
            
            // check if it is a "g + <char>" sequence
            if (parts.length === 2 && parts[0] === 'g') {
                const secondKey = parts[1];
                // Only register if not disabled
                if (!disabledKeybinds.includes(def.id)) {
                    gSequences[secondKey] = def.id;
                }
            }
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            // Track if key press is "dirty" for double shift (any non-shift key makes it dirty)
            if (e.key === 'Shift') {
                currentPressDirty.current = false;
            } else {
                currentPressDirty.current = true;
                lastCleanShiftUpTime.current = 0;
            }

            // Ignore inputs for navigation sequences
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
            
            if (isInput) return;

            const now = Date.now();
            const key = e.key.toLowerCase();

            // G-Sequence Logic
            if (now - lastKeyTime.current > 1000) {
                lastKey.current = null;
            }

            if (lastKey.current === 'g') {
                // Check against our dynamic map
                const targetId = gSequences[key];

                if (targetId) {
                    switch (targetId) {
                        case "nav.home": handleNavigation("/", "main"); break;
                        case "nav.storage": handleNavigation("/storage", "storage"); break;
                        case "nav.collections": handleNavigation("/collections", "main"); break;
                        case "nav.docs": handleNavigation("/docs", "docs"); break;
                        case "nav.graphs": handleNavigation("/graphs", "graphs"); break;
                    }
                    
                    e.preventDefault();
                    lastKey.current = null;
                    return;
                }
            }

            // Start G sequence
            if (key === 'g' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                lastKey.current = 'g';
                lastKeyTime.current = now;
            } else if (!['shift', 'control', 'alt', 'meta'].includes(key)) {
                lastKey.current = null;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            // Double Shift Logic (Shift Up)
            if (e.key === 'Shift') {
                const id = "global.doubleTapMenu";
                // Only if NOT customized and NOT disabled
                if (!customKeybinds[id] && !disabledKeybinds.includes(id)) {
                    if (!currentPressDirty.current) {
                        const now = Date.now();
                        if (now - lastCleanShiftUpTime.current < 300) {
                            // Double tap detected
                            setDoubleTapMenuOpen(true);
                            lastCleanShiftUpTime.current = 0;
                        } else {
                            lastCleanShiftUpTime.current = now;
                        }
                    } else {
                        lastCleanShiftUpTime.current = 0;
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [navigate, isDoubleTapMenuOpen, customKeybinds, disabledKeybinds]);

    return <ShortcutGuideDialog open={showGuide} onOpenChange={setShowGuide} />;
}
