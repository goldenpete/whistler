import { useEffect, useRef, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { usePrevious } from "@/hooks/usePrevious";
import ProjectSidebar from "./ProjectSidebar";
import { FloatingPlayer } from "@/components/player/FloatingPlayer";
import { ambientMusicStorage, useStore, type AppStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";

export function MainLayout() {
    const location = useLocation();
    const currentOutlet = useOutlet();
    const isPlayer = location.pathname.startsWith('/file/');
    const { 
        backgroundImageUrl, 
        backgroundImageOpacity, 
        backgroundColor, 
        backgroundOverlayOpacity, 
        ambientMusicUrl, 
        ambientMusicName,
        ambientMusicVolume, 
        ambientMusicSuppressedBy, 
        ambientMusicStorageKey,
        ambientMusicPaused, 
        setAmbientMusicUrl, 
        setAmbientMusicStorageKey 
    } = useStore(useShallow((state: AppStore) => ({
        backgroundImageUrl: state.backgroundImageUrl,
        backgroundImageOpacity: state.backgroundImageOpacity,
        backgroundColor: state.backgroundColor,
        backgroundOverlayOpacity: state.backgroundOverlayOpacity,
        ambientMusicUrl: state.ambientMusicUrl,
        ambientMusicName: state.ambientMusicName,
        ambientMusicVolume: state.ambientMusicVolume,
        ambientMusicSuppressedBy: state.ambientMusicSuppressedBy,
        ambientMusicStorageKey: state.ambientMusicStorageKey,
        ambientMusicPaused: state.ambientMusicPaused,
        setAmbientMusicUrl: state.setAmbientMusicUrl,
        setAmbientMusicStorageKey: state.setAmbientMusicStorageKey,
    })));
    const audioRef = useRef<HTMLAudioElement>(null);
    const ambientUrlRef = useRef<string | null>(null);
    const [ambientAutoplayBlocked, setAmbientAutoplayBlocked] = useState(false);
    
    // Track previous path to determine if we are navigating FROM a player
    const prevPath = usePrevious(location.pathname);
    const wasPlayer = prevPath?.startsWith('/file/');
    const shouldDelaySidebar = !isPlayer && wasPlayer;
    const isAmbientSuppressed = (ambientMusicSuppressedBy || []).length > 0;

    useEffect(() => {
        const restoreAmbientMusic = async () => {
            // Handle Default Music (Static Path)
            if (ambientMusicStorageKey === 'default' || (!ambientMusicStorageKey && ambientMusicName === 'Default: Evolve (Idle)')) {
                if (ambientMusicUrl !== '/sounds/default_ambient.mp3') {
                    setAmbientMusicUrl('/sounds/default_ambient.mp3', ambientMusicName || 'Default: Evolve (Idle)');
                    if (ambientMusicStorageKey !== 'default') {
                        setAmbientMusicStorageKey('default');
                    }
                }
                return;
            }

            if (!ambientMusicStorageKey) return;

            let needsRestore = false;

            if (!ambientMusicUrl) {
                needsRestore = true;
            } else if (ambientMusicUrl.startsWith('blob:')) {
                try {
                    // Check if the blob URL is valid
                    const res = await fetch(ambientMusicUrl);
                    if (!res.ok) needsRestore = true;
                } catch {
                    needsRestore = true;
                }
            }

            if (needsRestore) {
                try {
                    const blob = await ambientMusicStorage.load();
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        // Restore with preserved name
                        setAmbientMusicUrl(url, ambientMusicName);
                    } else {
                        // Data missing
                        setAmbientMusicStorageKey(null);
                    }
                } catch (err) {
                    console.error("Failed to restore ambient music:", err);
                }
            }
        };

        restoreAmbientMusic();
    }, []);

    useEffect(() => {
        const previousUrl = ambientUrlRef.current;
        if (previousUrl && previousUrl !== ambientMusicUrl && previousUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previousUrl);
        }
        ambientUrlRef.current = ambientMusicUrl;
        return () => {
            const currentUrl = ambientUrlRef.current;
            if (currentUrl && currentUrl.startsWith('blob:')) {
                URL.revokeObjectURL(currentUrl);
            }
        };
    }, [ambientMusicUrl]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = ambientMusicVolume ?? 0.4;
        }
    }, [ambientMusicVolume]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (!ambientMusicUrl) {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
            return;
        }
        if (audio.src !== ambientMusicUrl) {
            audio.src = ambientMusicUrl;
            audio.load();
        }
        audio.loop = true;
        
        const shouldPlay = !isAmbientSuppressed && !ambientMusicPaused;
        
        if (shouldPlay) {
            const playPromise = audio.play();
            if (playPromise) {
                playPromise.catch(() => {
                    setAmbientAutoplayBlocked(true);
                });
            }
        } else {
            audio.pause();
        }
    }, [ambientMusicUrl, isAmbientSuppressed, ambientMusicPaused]);

    useEffect(() => {
        if (!ambientAutoplayBlocked || !ambientMusicUrl || isAmbientSuppressed || ambientMusicPaused) return;
        
        const tryPlay = () => {
            const audio = audioRef.current;
            if (!audio) return;
            
            const playPromise = audio.play();
            if (playPromise) {
                playPromise
                    .then(() => {
                        console.log("Ambient music resumed after interaction");
                        setAmbientAutoplayBlocked(false);
                    })
                    .catch((err) => {
                        console.warn("Ambient music retry failed:", err);
                    });
            }
        };

        const opts = { capture: true };
        window.addEventListener("pointerdown", tryPlay, opts);
        window.addEventListener("keydown", tryPlay, opts);
        
        return () => {
            window.removeEventListener("pointerdown", tryPlay, opts);
            window.removeEventListener("keydown", tryPlay, opts);
        };
    }, [ambientAutoplayBlocked, ambientMusicUrl, isAmbientSuppressed, ambientMusicPaused]);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground animate-in fade-in duration-300">
            <audio ref={audioRef} loop />
            <AnimatePresence mode="wait">
                {!isPlayer && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ 
                            width: "auto", 
                            opacity: 1,
                            transition: { 
                                duration: 0.15, 
                                ease: "easeOut",
                                delay: shouldDelaySidebar ? 0.2 : 0 
                            }
                        }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.15, ease: "easeIn" }}
                        className="h-full flex-shrink-0"
                    >
                        <ProjectSidebar />
                    </motion.div>
                )}
            </AnimatePresence>
            <main className="flex-1 flex flex-col relative overflow-hidden bg-black">
                <div
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        backgroundColor: backgroundColor ?? '#000000',
                        opacity: backgroundOverlayOpacity ?? 0.5,
                    }}
                />
                {backgroundImageUrl && (
                    <div
                        className="absolute inset-0 z-0 pointer-events-none"
                        style={{
                            backgroundImage: `url(${backgroundImageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            opacity: backgroundImageOpacity ?? 0.2,
                        }}
                    />
                )}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, scale: isPlayer ? 0.95 : 1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: isPlayer ? 0.95 : 1 }}
                        transition={{ duration: 0.15, ease: "easeInOut" }}
                        className="h-full w-full relative z-10"
                    >
                        {currentOutlet}
                    </motion.div>
                </AnimatePresence>
            </main>
            <FloatingPlayer />
        </div>
    );
}
