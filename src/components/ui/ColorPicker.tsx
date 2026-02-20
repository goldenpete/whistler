import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Palette, Check, X } from "@phosphor-icons/react";

export const PRESET_COLORS = [
    "#f59e0b",
    "#ef4444",
    "#f97316",
    "#84cc16",
    "#10b981",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
    "#71717a",
    "#000000",
    "#ffffff",
];

export const ACCENT_COLOR_MAP = {
    orange: "#f59e0b",
    emerald: "#10b981",
    violet: "#8b5cf6",
    sky: "#06b6d4",
} as const;

interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    label?: string;
    showLabel?: boolean;
}

export function ColorPicker({ color, onChange, label = "Color", showLabel = true }: ColorPickerProps) {
    const [hex, setHex] = useState(color);
    const [format, setFormat] = useState<"hex" | "rgb" | "hsl">("hex");

    useEffect(() => {
        setHex(color);
    }, [color]);

    const normalizeHex = (value: string) => {
        const cleaned = value.trim().toUpperCase().replace(/^#/, "");
        if (!/^[0-9A-F]{6}$/.test(cleaned)) return null;
        return `#${cleaned}`;
    };

    const hexToRgb = (value: string) => {
        const normalized = normalizeHex(value);
        if (!normalized) return null;
        const raw = normalized.replace("#", "");
        const r = parseInt(raw.slice(0, 2), 16);
        const g = parseInt(raw.slice(2, 4), 16);
        const b = parseInt(raw.slice(4, 6), 16);
        return { r, g, b };
    };

    const rgbToHex = (r: number, g: number, b: number) => {
        const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
        const toHex = (n: number) => clamp(n).toString(16).padStart(2, "0").toUpperCase();
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    const rgbToHsl = (r: number, g: number, b: number) => {
        const rn = r / 255;
        const gn = g / 255;
        const bn = b / 255;
        const max = Math.max(rn, gn, bn);
        const min = Math.min(rn, gn, bn);
        const delta = max - min;
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (delta !== 0) {
            s = delta / (1 - Math.abs(2 * l - 1));
            switch (max) {
                case rn:
                    h = ((gn - bn) / delta) % 6;
                    break;
                case gn:
                    h = (bn - rn) / delta + 2;
                    break;
                default:
                    h = (rn - gn) / delta + 4;
                    break;
            }
            h *= 60;
            if (h < 0) h += 360;
        }

        return {
            h: Math.round(h),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    };

    const hexToHsl = (value: string) => {
        const rgb = hexToRgb(value);
        if (!rgb) return null;
        return rgbToHsl(rgb.r, rgb.g, rgb.b);
    };

    const hslToRgb = (h: number, s: number, l: number) => {
        const sn = Math.min(100, Math.max(0, s)) / 100;
        const ln = Math.min(100, Math.max(0, l)) / 100;
        const c = (1 - Math.abs(2 * ln - 1)) * sn;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = ln - c / 2;
        let r = 0;
        let g = 0;
        let b = 0;

        if (h >= 0 && h < 60) {
            r = c; g = x; b = 0;
        } else if (h < 120) {
            r = x; g = c; b = 0;
        } else if (h < 180) {
            r = 0; g = c; b = x;
        } else if (h < 240) {
            r = 0; g = x; b = c;
        } else if (h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    };

    const parseRgbInput = (value: string) => {
        const cleaned = value.replace(/rgb|\(|\)|%/gi, "");
        const parts = cleaned.split(/[,\s]+/).filter(Boolean).slice(0, 3).map(Number);
        if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
        const [r, g, b] = parts;
        if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) return null;
        return { r, g, b };
    };

    const parseHslInput = (value: string) => {
        const cleaned = value.replace(/hsl|\(|\)|%/gi, "");
        const parts = cleaned.split(/[,\s]+/).filter(Boolean).slice(0, 3).map(Number);
        if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
        const [h, s, l] = parts;
        if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null;
        return { h, s, l };
    };

    const handleInputChange = (val: string) => {
        if (format === "hex") {
            setHex(val);
            const normalized = normalizeHex(val);
            if (normalized) onChange(normalized);
            return;
        }

        if (format === "rgb") {
            const parsed = parseRgbInput(val);
            if (!parsed) return;
            const nextHex = rgbToHex(parsed.r, parsed.g, parsed.b);
            setHex(nextHex);
            onChange(nextHex);
            return;
        }

        const parsed = parseHslInput(val);
        if (!parsed) return;
        const rgb = hslToRgb(parsed.h, parsed.s, parsed.l);
        const nextHex = rgbToHex(rgb.r, rgb.g, rgb.b);
        setHex(nextHex);
        onChange(nextHex);
    };

    const currentHex = normalizeHex(hex) || "#000000";
    const displayValue = (() => {
        if (format === "hex") return currentHex;
        if (format === "rgb") {
            const rgb = hexToRgb(currentHex) || { r: 0, g: 0, b: 0 };
            return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        }
        const hsl = hexToHsl(currentHex) || { h: 0, s: 0, l: 0 };
        return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    })();

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
            <div className={cn("flex items-center", showLabel ? "justify-between" : "justify-center")}>
                {showLabel && <Label>{label}</Label>}
                <div className="flex items-center gap-2">
                    <div
                        className="w-6 h-6 rounded-none border border-white/20 shadow-sm"
                        style={{ backgroundColor: color }}
                    />
                    <div className="relative">
                        <Input
                            value={displayValue}
                            onChange={(e) => handleInputChange(e.target.value)}
                            className={cn(
                                "h-8 font-mono text-xs uppercase bg-zinc-900 border-zinc-800 focus:border-zinc-700 pl-7",
                                format === "hex" && "w-24",
                                format === "rgb" && "w-52",
                                format === "hsl" && "w-52"
                            )}
                        />
                        <Palette className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                    </div>
                    <Select value={format} onValueChange={(val) => setFormat(val as "hex" | "rgb" | "hsl")}>
                        <SelectTrigger size="sm" className="h-8 bg-zinc-900 border-zinc-800 text-zinc-300">
                            <SelectValue placeholder="HEX" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hex">HEX</SelectItem>
                            <SelectItem value="rgb">RGB</SelectItem>
                            <SelectItem value="hsl">HSL</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 p-3 bg-zinc-900/50 rounded-none border border-white/5">
                {PRESET_COLORS.map((c) => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => {
                            onChange(c);
                            setHex(c);
                        }}
                        className={cn(
                            "w-6 h-6 rounded-none transition-all border-2 relative flex items-center justify-center group",
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

                <button
                    type="button"
                    className="w-6 h-6 rounded-none transition-all border-2 relative flex items-center justify-center group bg-zinc-900 border-transparent hover:border-white/30 hover:scale-110"
                    title="Custom Color"
                >
                    <Palette weight="bold" className="w-3 h-3 text-zinc-400 group-hover:text-white" />
                    <input
                        type="color"
                        value={color || "#000000"}
                        onChange={(e) => {
                            const next = e.target.value;
                            setHex(next);
                            onChange(next);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label="Choose custom color"
                    />
                </button>
                
                <button
                    type="button"
                    onClick={() => {
                        onChange("");
                        setHex("");
                    }}
                    className={cn(
                        "w-6 h-6 rounded-none transition-all border-2 relative flex items-center justify-center group",
                        !color ? "border-white scale-110 bg-zinc-800" : "border-transparent hover:scale-110 hover:border-white/20 bg-zinc-800/50"
                    )}
                    title="No Color"
                >
                    {!color && (
                        <Check weight="bold" className="w-3 h-3 text-white shadow-sm" />
                    )}
                    {color && (
                        <X weight="bold" className="w-3 h-3 text-zinc-400 group-hover:text-white" />
                    )}
                </button>
            </div>
        </div>
    );
}
