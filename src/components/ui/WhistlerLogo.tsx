import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import whistlerLogoOrange from "../../../whistlerlogo.png";
import whistlerLogoEmerald from "../../../whistlerlogo-emerald.png";
import whistlerLogoSky from "../../../whistlerlogo-sky.png";
import whistlerLogoViolet from "../../../whistlerlogo-violet.png";
import { WaveSine } from "@phosphor-icons/react";

const LOGO_MAP: Record<string, string> = {
    orange: whistlerLogoOrange,
    emerald: whistlerLogoEmerald,
    sky: whistlerLogoSky,
    violet: whistlerLogoViolet,
};

interface WhistlerLogoProps {
    className?: string;
    width?: number | string;
    height?: number | string;
}

export function WhistlerLogo({ className, width = 32, height = 32 }: WhistlerLogoProps) {
    const { accentTheme, customAccentThemes } = useStore();

    // If it's a preset theme, use the PNG directly
    if (LOGO_MAP[accentTheme]) {
        return (
            <img 
                src={LOGO_MAP[accentTheme]} 
                alt="Whistler Logo" 
                className={className}
                style={{ width, height }}
            />
        );
    }

    // If it's a custom theme, use SVG reconstruction
    if (accentTheme.startsWith('custom-')) {
        const customTheme = customAccentThemes?.[accentTheme];
        const primaryColor = customTheme?.colors['--primary'] || '#f59e0b'; // Default to orange if not found
        const primaryForeground = customTheme?.colors['--primary-foreground'] || '#ffffff';
        
        return (
            <div 
                className={cn("shrink-0 flex items-center justify-center", className)}
                style={{
                    width,
                    height,
                    backgroundColor: primaryColor,
                }}
            >
                <WaveSine 
                    weight="fill" 
                    className="w-[60%] h-[60%]"
                    style={{ color: primaryForeground }}
                />
            </div>
        );
    }

    // Fallback
    return (
        <img 
            src={whistlerLogoOrange} 
            alt="Whistler Logo" 
            className={className}
            style={{ width, height }}
        />
    );
}
