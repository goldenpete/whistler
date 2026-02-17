/**
 * ─── FloatingPlayer.tsx ────────────────────────────────────────────
 *
 * Manages one or more floating (detached) video player windows that
 * persist across view navigation, with minimize and z-ordering.
 *
 * Features:
 *   - Multiple simultaneous floating player windows
 *   - Per-window minimize/restore with taskbar-style buttons
 *   - Z-index management for window focus ordering
 *   - Exit-floating to navigate back to full file view
 *   - Delegates rendering to VideoPlayer with floating props
 *
 * Exports: FloatingPlayer component
 * Related: VideoPlayer, useStore (floatingPlayerWindows state)
 * ───────────────────────────────────────────────────────────────────
 */
import { useNavigate } from "react-router-dom";
import { useStore, type AppStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import VideoPlayer from "@/components/player/VideoPlayer";

export function FloatingPlayer() {
    const navigate = useNavigate();
    const { floatingPlayerWindows, setFloatingPlayerMinimized, removeFloatingPlayer, files, bringFloatingPlayerToFront } = useStore(useShallow((state: AppStore) => ({
        floatingPlayerWindows: state.floatingPlayerWindows,
        setFloatingPlayerMinimized: state.setFloatingPlayerMinimized,
        removeFloatingPlayer: state.removeFloatingPlayer,
        files: state.files,
        bringFloatingPlayerToFront: state.bringFloatingPlayerToFront
    })));

    if (floatingPlayerWindows.length === 0) return null;

    const minimizedWindows = floatingPlayerWindows.filter((window) => window.minimized);

    return (
        <>
            {floatingPlayerWindows.map((window, index) => (
                <VideoPlayer
                    key={window.id}
                    fileIdOverride={window.fileId}
                    floating
                    isMinimized={window.minimized}
                    windowZIndex={80 + index}
                    onFocus={() => bringFloatingPlayerToFront(window.id)}
                    onMinimize={() => setFloatingPlayerMinimized(window.id, true)}
                    onClose={() => removeFloatingPlayer(window.id)}
                    onExitFloating={() => {
                        removeFloatingPlayer(window.id);
                        navigate(`/file/${window.fileId}`);
                    }}
                />
            ))}
            {minimizedWindows.length > 0 && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2">
                    {minimizedWindows.map((window) => {
                        const name = files.find((file) => file.id === window.fileId)?.name || "Window";
                        return (
                            <button
                                key={window.id}
                                className="h-8 px-3 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                onClick={() => setFloatingPlayerMinimized(window.id, false)}
                            >
                                {name}
                            </button>
                        );
                    })}
                </div>
            )}
        </>
    );
}
