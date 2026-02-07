import { useState, useEffect, useRef } from "react";
import { useKeybind } from "@/hooks/use-keybind";
import { useNavigate, useLocation } from "react-router-dom";
import { ShortcutGuideDialog } from "@/components/dialogs/ShortcutGuideDialog";
import { useStore } from "@/store/useStore";

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

    // Toggle Settings
    const { toggleSidebar, toggleSidebarCollapse, isSidebarOpen, setSidebarView, setDoubleTapMenuOpen, isDoubleTapMenuOpen } = useStore();

    const handleNavigation = (path: string, targetView: 'storage' | 'docs' | 'graphs' | 'main') => {
        navigate(path);
        const currentView = useStore.getState().sidebarView;
        const isDoubleTapOpen = ['storage', 'docs', 'graphs'].includes(currentView);
        
        if (isDoubleTapOpen) {
            setSidebarView(targetView);
        }
    };

    // --- Global Shortcuts ---
    useKeybind("shift+?", () => setShowGuide(prev => !prev), { preventDefault: true });
    
    // Settings: Ctrl+,
    useKeybind("ctrl+,", () => {
        navigate("/settings");
    }, { preventDefault: true });

    // Toggle Sidebar: Ctrl+B
    useKeybind("ctrl+b", () => {
        if (location.pathname.includes('/file/')) {
            toggleSidebar(!isSidebarOpen);
        } else {
            toggleSidebarCollapse();
        }
    }, { preventDefault: true });

    // --- Navigation Shortcuts (Legacy) ---
    useKeybind("1", () => handleNavigation("/storage", "storage"), { preventDefault: true, disableInInput: true });
    useKeybind("2", () => handleNavigation("/docs", "docs"), { preventDefault: true, disableInInput: true });
    useKeybind("3", () => handleNavigation("/graphs", "graphs"), { preventDefault: true, disableInInput: true });
    useKeybind("4", () => handleNavigation("/collections", "main"), { preventDefault: true, disableInInput: true });
    useKeybind("5", () => handleNavigation("/", "main"), { preventDefault: true, disableInInput: true });

    // --- Sequence Handler (G + Key) & Double Shift ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Double Shift Logic
            if (e.key === "Shift" && !e.repeat) {
                const now = Date.now();
                if (now - lastShiftTime.current < 300) {
                    // Double tap detected
                    setDoubleTapMenuOpen(!isDoubleTapMenuOpen);
                    lastShiftTime.current = 0; // Reset
                } else {
                    lastShiftTime.current = now;
                }
            } else if (e.key !== "Shift") {
                // If any other key is pressed, reset the shift timer
                lastShiftTime.current = 0;
            }

            // Ignore if in input for other shortcuts
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' || 
                target.tagName === 'TEXTAREA' || 
                target.isContentEditable
            ) {
                return;
            }

            const now = Date.now();
            const key = e.key.toLowerCase();

            // Check for sequence timeout (1 second)
            if (now - lastKeyTime.current > 1000) {
                lastKey.current = null;
            }

            // Check for G-sequence completion
            if (lastKey.current === 'g') {
                let handled = false;
                switch (key) {
                    case 'h':
                        handleNavigation("/", "main");
                        handled = true;
                        break;
                    case 's':
                        handleNavigation("/storage", "storage");
                        handled = true;
                        break;
                    case 'c':
                        handleNavigation("/collections", "main");
                        handled = true;
                        break;
                    case 'd':
                        handleNavigation("/docs", "docs");
                        handled = true;
                        break;
                    case 'g':
                        handleNavigation("/graphs", "graphs");
                        handled = true;
                        break;
                }

                if (handled) {
                    e.preventDefault();
                    lastKey.current = null; // Reset sequence
                    return;
                }
            }

            // Start sequence
            if (key === 'g' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                lastKey.current = 'g';
                lastKeyTime.current = now;
                // We don't prevent default on 'g' immediately to allow typing if focus check fails? 
                // But we checked focus above.
            } else if (!['shift', 'control', 'alt', 'meta'].includes(key)) {
                // Reset if any other key is pressed that isn't a modifier
                lastKey.current = null;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    // --- Double Shift Menu ---
    useEffect(() => {
        let lastCleanShiftUpTime = 0;
        let currentPressDirty = false;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                currentPressDirty = false;
            } else {
                currentPressDirty = true;
                lastCleanShiftUpTime = 0; // Invalidate sequence if any other key is pressed
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                if (!currentPressDirty) {
                    const now = Date.now();
                    if (now - lastCleanShiftUpTime < 300) {
                        useStore.getState().setDoubleTapMenuOpen(true);
                        lastCleanShiftUpTime = 0;
                    } else {
                        lastCleanShiftUpTime = now;
                    }
                } else {
                    // If dirty, we don't start a sequence, and we break any existing one
                    lastCleanShiftUpTime = 0;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    return <ShortcutGuideDialog open={showGuide} onOpenChange={setShowGuide} />;
}
