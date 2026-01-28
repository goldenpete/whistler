import { Outlet, useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { usePrevious } from "@/hooks/usePrevious";
import ProjectSidebar from "./ProjectSidebar";
import { useStore } from "@/store/useStore";

export function MainLayout() {
    const location = useLocation();
    const currentOutlet = useOutlet();
    const isPlayer = location.pathname.startsWith('/file/');
    const { backgroundImageUrl, backgroundImageOpacity } = useStore();
    
    // Track previous path to determine if we are navigating FROM a player
    const prevPath = usePrevious(location.pathname);
    const wasPlayer = prevPath?.startsWith('/file/');
    const shouldDelaySidebar = !isPlayer && wasPlayer;

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground animate-in fade-in duration-300">
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
            <main className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-tr from-[#131318] to-background">
                {backgroundImageUrl && (
                    <div
                        className="absolute inset-0 -z-10 pointer-events-none"
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
                        className="h-full w-full"
                    >
                        {currentOutlet}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
