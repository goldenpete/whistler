import { useStore } from "@/store/useStore";

export default function HomeView() {
    return (
        <div className="flex-1 flex items-center justify-center bg-background h-full w-full">
            <img 
                src="/whistler-logo.png" 
                alt="Whistler Logo" 
                className="w-32 h-32 opacity-20 pointer-events-none select-none"
            />
        </div>
    );
}
