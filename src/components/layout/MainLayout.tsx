import { useEffect, useRef, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { usePrevious } from "@/hooks/usePrevious";
import ProjectSidebar from "./ProjectSidebar";
import { ambientMusicStorage, useStore } from "@/store/useStore";
import { useShallow } from 'zustand/react/shallow';

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
        ambientMusicVolume, 
        ambientMusicSuppressedBy, 
        ambientMusicStorageKey, 
        setAmbientMusicUrl, 
        setAmbientMusicStorageKey 
    } = useStore(useShallow((state) => ({
        backgroundImageUrl: state.backgroundImageUrl,
        backgroundImageOpacity: state.backgroundImageOpacity,
        backgroundColor: state.backgroundColor,
        backgroundOverlayOpacity: state.backgroundOverlayOpacity,
        ambientMusicUrl: state.ambientMusicUrl,
        ambientMusicVolume: state.ambientMusicVolume,
        ambientMusicSuppressedBy: state.ambientMusicSuppressedBy,
        ambientMusicStorageKey: state.ambientMusicStorageKey,
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
        let active = true;
        if (ambientMusicUrl || !ambientMusicStorageKey) return;
        ambientMusicStorage
            .load()
            .then((blob) => {
                if (!active) return;
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    setAmbientMusicUrl(url);
                } else {
                    setAmbientMusicStorageKey(null);
                }
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [ambientMusicUrl, ambientMusicStorageKey, setAmbientMusicUrl, setAmbientMusicStorageKey]);

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
        if (isAmbientSuppressed) {
            audio.pause();
        } else {
            const playPromise = audio.play();
            if (playPromise) {
                playPromise.catch(() => {
                    setAmbientAutoplayBlocked(true);
                });
            }
        }
    }, [ambientMusicUrl, isAmbientSuppressed]);

    useEffect(() => {
        if (!ambientAutoplayBlocked || !ambientMusicUrl || isAmbientSuppressed) return;
        const tryPlay = () => {
            const audio = audioRef.current;
            if (!audio) return;
            const playPromise = audio.play();
            if (playPromise) {
                playPromise
                    .then(() => {
                        setAmbientAutoplayBlocked(false);
                    })
                    .catch(() => {});
            }
        };
        window.addEventListener("pointerdown", tryPlay, { once: true });
        window.addEventListener("keydown", tryPlay, { once: true });
        return () => {
            window.removeEventListener("pointerdown", tryPlay);
            window.removeEventListener("keydown", tryPlay);
        };
    }, [ambientAutoplayBlocked, ambientMusicUrl, isAmbientSuppressed]);

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
        </div>
    );
}
