import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

export function MainLayout() {
    const location = useLocation();
    const isPlayer = location.pathname.startsWith('/file/');

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground animate-in fade-in duration-300">
            {!isPlayer && <Sidebar />}
            <main className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-tr from-[#131318] to-background">
                <Outlet />
            </main>
        </div>
    );
}
