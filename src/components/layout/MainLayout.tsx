import { Outlet, useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar";

export function MainLayout() {
    const location = useLocation();
    const currentOutlet = useOutlet();
    const isPlayer = location.pathname.startsWith('/file/');

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground animate-in fade-in duration-300">
            <AnimatePresence mode="wait">
                {!isPlayer && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="h-full flex-shrink-0"
                    >
                        <Sidebar />
                    </motion.div>
                )}
            </AnimatePresence>
            <main className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-tr from-[#131318] to-background">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, scale: isPlayer ? 0.98 : 1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: isPlayer ? 0.98 : 1 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="h-full w-full"
                    >
                        {currentOutlet}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
