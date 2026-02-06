import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import whistlerLogoOrange from "../../../whistlerlogo.png";
import whistlerLogoEmerald from "../../../whistlerlogo-emerald.png";
import whistlerLogoSky from "../../../whistlerlogo-sky.png";
import whistlerLogoViolet from "../../../whistlerlogo-violet.png";
import type { AccentTheme } from "@/types";

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

    // If it's a custom theme, use masking
    if (accentTheme.startsWith('custom-')) {
        const customTheme = customAccentThemes?.[accentTheme];
        const primaryColor = customTheme?.colors['--primary'] || '#f59e0b'; // Default to orange if not found
        
        return (
            <div 
                className={cn("shrink-0", className)}
                style={{
                    width,
                    height,
                    backgroundColor: primaryColor,
                    maskImage: `url(${whistlerLogoOrange})`,
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskImage: `url(${whistlerLogoOrange})`,
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                }}
            />
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
