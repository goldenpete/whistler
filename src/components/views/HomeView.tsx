import { useStore } from "@/store/useStore";
import whistlerLogo from "../../../whistlerlogo.png";

export default function HomeView() {
    return (
        <div className="flex-1 flex items-center justify-center bg-background h-full w-full">
            <img 
                src={whistlerLogo}
                alt="Whistlerbox Logo" 
                className="w-28 h-28 rounded-2xl pointer-events-none select-none"
            />
        </div>
    );
}
