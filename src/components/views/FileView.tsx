/**
 * ─── FileView.tsx ──────────────────────────────────────────────────
 *
 * Lightweight wrapper view that renders the VideoPlayer component
 * for full-screen media playback of a selected file.
 *
 * Features:
 *   - Full-size transparent container for the player
 *   - Delegates all playback logic to VideoPlayer
 *
 * Exports: default FileView component
 * Related: VideoPlayer
 * ───────────────────────────────────────────────────────────────────
 */
import VideoPlayer from "@/components/player/VideoPlayer";

export default function FileView() {
    return (
        <div className="relative w-full h-full bg-transparent">
            <VideoPlayer />
        </div>
    );
}
