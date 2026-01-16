import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Palette, Check } from "@phosphor-icons/react";

export const PRESET_COLORS = [
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#f97316", // Orange
    "#84cc16", // Lime
    "#10b981", // Emerald
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
    "#6366f1", // Indigo
    "#8b5cf6", // Violet
    "#d946ef", // Fuchsia
    "#ec4899", // Pink
    "#f43f5e", // Rose
    "#71717a", // Zinc
    "#000000", // Black
    "#ffffff", // White
];

interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    label?: string;
}

export function ColorPicker({ color, onChange, label = "Color" }: ColorPickerProps) {
    const [hex, setHex] = useState(color);

    useEffect(() => {
        setHex(color);
    }, [color]);

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setHex(val);
        // Basic hex validation
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            onChange(val);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label>{label}</Label>
                <div className="flex items-center gap-2">
                    <div
                        className="w-6 h-6 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: color }}
                    />
                    <div className="relative">
                        <Input
                            value={hex}
                            onChange={handleHexChange}
                            className="h-8 w-28 font-mono text-xs uppercase bg-zinc-900 border-zinc-800 focus:border-zinc-700 pl-7"
                            maxLength={7}
                        />
                        <Palette className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 p-3 bg-zinc-900/50 rounded-lg border border-white/5">
                {PRESET_COLORS.map((c) => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => {
                            onChange(c);
                            setHex(c);
                        }}
                        className={cn(
                            "w-6 h-6 rounded-full transition-all border-2 relative flex items-center justify-center group",
                            color.toLowerCase() === c.toLowerCase() ? "border-white scale-110" : "border-transparent hover:scale-110 hover:border-white/20"
                        )}
                        style={{ backgroundColor: c }}
                        title={c}
                    >
                        {color.toLowerCase() === c.toLowerCase() && (
                            <Check weight="bold" className={cn("w-3 h-3", c === "#ffffff" ? "text-black" : "text-white shadow-sm")} />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
