import { useEffect, useRef, useState, Suspense } from "react";
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
        backgroundGradient,
        backgroundIsGradient,
        backgroundOverlayOpacity, 
        ambientMusicUrl, 
        ambientMusicName,
        ambientMusicType,
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
        backgroundGradient: state.backgroundGradient,
        backgroundIsGradient: state.backgroundIsGradient,
        backgroundOverlayOpacity: state.backgroundOverlayOpacity,
        ambientMusicUrl: state.ambientMusicUrl,
        ambientMusicName: state.ambientMusicName,
        ambientMusicType: state.ambientMusicType,
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
        // Clear any stuck suppression on mount
        if (ambientMusicSuppressedBy.length > 0) {
             useStore.setState({ ambientMusicSuppressedBy: [] });
        }

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

            // If we have a name but no key/url, it's likely a custom track that needs restoration
            // This handles the case where storageKey might have been lost or not set in previous versions
            let shouldAttemptRestore = false;
            
            if (ambientMusicStorageKey === 'current') {
                shouldAttemptRestore = true;
            } else if (!ambientMusicStorageKey && ambientMusicName) {
                // Legacy/Fallback: We have a name but no key, assume it's a custom track
                shouldAttemptRestore = true;
                setAmbientMusicStorageKey('current');
            }

            if (!shouldAttemptRestore) return;

            let needsRestore = false;

            if (!ambientMusicUrl) {
                needsRestore = true;
            } else if (ambientMusicUrl.startsWith('blob:')) {
                // Always restore blob URLs on mount to ensure freshness
                needsRestore = true;
            }

            if (needsRestore) {
                try {
                    const blob = await ambientMusicStorage.load();
                    if (blob) {
                        // Revoke old URL if it exists to prevent memory leaks
                        if (ambientMusicUrl && ambientMusicUrl.startsWith('blob:')) {
                            URL.revokeObjectURL(ambientMusicUrl);
                        }
                        const url = URL.createObjectURL(blob);
                        // Restore with preserved name
                        setAmbientMusicUrl(url, ambientMusicName, ambientMusicType);
                    } else {
                        // Data missing - Clear state to prevent "ghost" music
                        setAmbientMusicStorageKey(null);
                        setAmbientMusicUrl(null, null);
                    }
                } catch (err) {
                    console.error("Failed to restore ambient music:", err);
                    setAmbientMusicStorageKey(null);
                    setAmbientMusicUrl(null, null);
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
                        background: backgroundIsGradient 
                            ? (backgroundGradient || 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)')
                            : (backgroundColor || '#000000'),
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
                        <Suspense fallback={<div className="h-full w-full bg-transparent" />}>
                            {currentOutlet}
                        </Suspense>
                    </motion.div>
                </AnimatePresence>
            </main>
            <FloatingPlayer />
        </div>
    );
}
