import { useKeybind } from "@/hooks/use-keybind";
import { useNavigate } from "react-router-dom";

/**
 * Global keyboard shortcuts configuration.
 * These are application-wide keybinds that work regardless of the current view.
 */
export function GlobalKeybinds() {
    const navigate = useNavigate();

    // --- Navigation Shortcuts ---
    useKeybind("1", () => navigate("/storage"), { preventDefault: true, disableInInput: true });
    useKeybind("2", () => navigate("/docs"), { preventDefault: true, disableInInput: true });
    useKeybind("3", () => navigate("/graphs"), { preventDefault: true, disableInInput: true });

    // --- Quick Actions ---
    // Escape to close modals/go back (placeholder)
    useKeybind("escape", () => {
        // Future: close any open modal or navigate back
    });

    return null; // This component doesn't render anything
}
