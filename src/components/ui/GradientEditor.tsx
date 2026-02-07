import React, { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Button } from "@/components/ui/button";
import { ArrowsLeftRight, Plus, Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface GradientEditorProps {
    value: string;
    onChange: (value: string) => void;
}

interface ColorStop {
    id: string;
    color: string;
    position: number;
}

export function GradientEditor({ value, onChange }: GradientEditorProps) {
    const [angle, setAngle] = useState(135);
    const [stops, setStops] = useState<ColorStop[]>([
        { id: '1', color: '#1a1a1a', position: 0 },
        { id: '2', color: '#000000', position: 100 }
    ]);

    // Parse gradient string on mount/update
    useEffect(() => {
        if (!value.startsWith('linear-gradient')) return;

        try {
            // Basic parser for linear-gradient(135deg, #color 0%, #color 100%)
            const match = value.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
            if (match) {
                const parsedAngle = parseInt(match[1]);
                const stopsStr = match[2];
                
                // This is a naive split, it might break if colors use commas (like rgba)
                // For this implementation, we assume hex or simple colors for safety, or we improve regex
                // A better way is to split by ", " but handle parenthesis
                const rawStops = stopsStr.split(/,(?![^(]*\))/).map(s => s.trim());
                
                const parsedStops = rawStops.map((s, i) => {
                    const parts = s.match(/(.+?)\s+(\d+)%/);
                    if (parts) {
                        return {
                            id: i.toString(),
                            color: parts[1],
                            position: parseInt(parts[2])
                        };
                    }
                    // Fallback if no percentage
                    return {
                        id: i.toString(),
                        color: s,
                        position: i === 0 ? 0 : 100
                    };
                });

                setAngle(parsedAngle);
                setStops(parsedStops);
            }
        } catch (e) {
            console.error("Failed to parse gradient", e);
        }
    }, [value]);

    const updateGradient = (newAngle: number, newStops: ColorStop[]) => {
        // Sort stops by position
        const sortedStops = [...newStops].sort((a, b) => a.position - b.position);
        const stopsStr = sortedStops.map(s => `${s.color} ${s.position}%`).join(', ');
        const gradient = `linear-gradient(${newAngle}deg, ${stopsStr})`;
        onChange(gradient);
    };

    const handleAngleChange = (vals: number[]) => {
        setAngle(vals[0]);
        updateGradient(vals[0], stops);
    };

    const handleStopColorChange = (id: string, color: string) => {
        const newStops = stops.map(s => s.id === id ? { ...s, color } : s);
        setStops(newStops);
        updateGradient(angle, newStops);
    };

    const handleStopPosChange = (id: string, pos: number) => {
        const newStops = stops.map(s => s.id === id ? { ...s, position: pos } : s);
        setStops(newStops);
        updateGradient(angle, newStops);
    };

    const addStop = () => {
        const newStop = {
            id: crypto.randomUUID(),
            color: '#808080',
            position: 50
        };
        const newStops = [...stops, newStop];
        setStops(newStops);
        updateGradient(angle, newStops);
    };

    const removeStop = (id: string) => {
        if (stops.length <= 2) return;
        const newStops = stops.filter(s => s.id !== id);
        setStops(newStops);
        updateGradient(angle, newStops);
    };

    const reverseGradient = () => {
        const newStops = stops.map(s => ({
            ...s,
            position: 100 - s.position
        }));
        setStops(newStops);
        updateGradient(angle, newStops);
    };

    return (
        <div className="space-y-4">
            {/* Angle Slider */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Angle</label>
                    <span className="text-xs font-mono text-muted-foreground">{angle}°</span>
                </div>
                <Slider
                    value={[angle]}
                    min={0}
                    max={360}
                    step={1}
                    onValueChange={handleAngleChange}
                />
            </div>

            {/* Visual Gradient Preview & Stops */}
            <div className="space-y-2">
                <div className="h-4 w-full rounded-md border border-border relative mb-6" style={{ background: `linear-gradient(90deg, ${stops.map(s => `${s.color || 'transparent'} ${s.position}%`).join(', ')})` }}>
                    {stops.map((stop) => (
                        <Popover key={stop.id}>
                            <PopoverTrigger asChild>
                                <button
                                    className="absolute w-3 h-3 -ml-1.5 top-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ring-1 ring-black/20 hover:scale-125 transition-transform focus:outline-none"
                                    style={{ 
                                        left: `${stop.position}%`,
                                        backgroundColor: stop.color || 'transparent'
                                    }}
                                />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3" side="top">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs font-medium">Stop Color</span>
                                        {stops.length > 2 && (
                                            <button 
                                                onClick={() => removeStop(stop.id)}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <ColorPicker
                                        color={stop.color}
                                        onChange={(c) => handleStopColorChange(stop.id, c)}
                                    />
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Position</span>
                                            <span>{stop.position}%</span>
                                        </div>
                                        <Slider
                                            value={[stop.position]}
                                            min={0}
                                            max={100}
                                            step={1}
                                            onValueChange={([v]) => handleStopPosChange(stop.id, v)}
                                        />
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={addStop} className="flex-1 h-8 text-xs">
                    <Plus className="mr-2" size={14} />
                    Add Stop
                </Button>
                <Button variant="outline" size="sm" onClick={reverseGradient} className="flex-1 h-8 text-xs">
                    <ArrowsLeftRight className="mr-2" size={14} />
                    Reverse
                </Button>
            </div>
        </div>
    );
}
