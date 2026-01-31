import { useNavigate } from "react-router-dom";
import { useStore, type AppStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import VideoPlayer from "@/components/player/VideoPlayer";

export function FloatingPlayer() {
    const navigate = useNavigate();
    const { floatingPlayerFileId, setFloatingPlayer } = useStore(useShallow((state: AppStore) => ({
        floatingPlayerFileId: state.floatingPlayerFileId,
        setFloatingPlayer: state.setFloatingPlayer
    })));

    if (!floatingPlayerFileId) return null;

    const handleClose = () => {
        setFloatingPlayer(null);
    };

    const handleExitFloating = () => {
        const targetId = floatingPlayerFileId;
        setFloatingPlayer(null);
        navigate(`/file/${targetId}`);
    };

    return (
        <VideoPlayer
            fileIdOverride={floatingPlayerFileId}
            floating
            onClose={handleClose}
            onExitFloating={handleExitFloating}
        />
    );
}
