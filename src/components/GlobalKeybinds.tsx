import { useState, useEffect, useRef } from "react";
import { useKeybind } from "@/hooks/use-keybind";
import { useNavigate } from "react-router-dom";
import { ShortcutGuideDialog } from "@/components/dialogs/ShortcutGuideDialog";
import { useStore } from "@/store/useStore";

/**
 * Global keyboard shortcuts configuration.
 * These are application-wide keybinds that work regardless of the current view.
 */
export function GlobalKeybinds() {
    const navigate = useNavigate();
    const [showGuide, setShowGuide] = useState(false);
    
    // Sequence state
    const lastKeyTime = useRef<number>(0);
    const lastKey = useRef<string | null>(null);

    // Toggle Settings
    const { toggleSidebar, setSidebarView } = useStore();

    // --- Global Shortcuts ---
    useKeybind("shift+?", () => setShowGuide(prev => !prev), { preventDefault: true });
    
    // Settings: Ctrl+,
    useKeybind("ctrl+,", () => {
        navigate("/settings");
    }, { preventDefault: true });

    // --- Navigation Shortcuts (Legacy) ---
    useKeybind("1", () => navigate("/storage"), { preventDefault: true, disableInInput: true });
    useKeybind("2", () => navigate("/docs"), { preventDefault: true, disableInInput: true });
    useKeybind("3", () => navigate("/graphs"), { preventDefault: true, disableInInput: true });

    // --- Sequence Handler (G + Key) ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if in input
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
                        navigate("/");
                        handled = true;
                        break;
                    case 's':
                        navigate("/storage");
                        handled = true;
                        break;
                    case 'c':
                        navigate("/collections");
                        handled = true;
                        break;
                    case 'd':
                        navigate("/docs");
                        handled = true;
                        break;
                    case 'g':
                        navigate("/graphs");
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

    return <ShortcutGuideDialog open={showGuide} onOpenChange={setShowGuide} />;
}
