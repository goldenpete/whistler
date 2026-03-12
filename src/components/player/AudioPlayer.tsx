/**
 * ─── AudioPlayer.tsx ─────────────────────────────────────────────────────────
 *
 * Audio playback component with custom controls.
 *
 * Features:
 *   - Play/pause, seek bar, volume control
 *   - Playback speed adjustment (0.5x–2x)
 *   - Skip forward/backward (10s)
 *   - Loop mode toggle
 *   - Waveform-style visual progress bar
 *   - Time-range highlights: create and navigate audio annotations
 *   - Collection association for highlights
 *   - Per-file volume persistence
 *   - Auto-resume from last playback position
 *
 * Uses forwardRef + useImperativeHandle to expose control methods
 * (play, pause, seek, addHighlight) to the parent FileView component.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { 
    Play, 
    Pause, 
    SpeakerHigh, 
    SpeakerX, 
    Repeat, 
    ArrowCounterClockwise,
    ArrowClockwise,
    MusicNotes,
    Minus,
    Plus
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { useShallow } from '@/lib/zustand-shallow';
import { playSfx } from '@/utils/sound';

import type { Highlight, Collection } from "@/types";

interface AudioPlayerProps {
    url: string;
    fileId: string;
    showControls?: boolean;
    className?: string;
    highlights?: Highlight[];
    highlight?: Highlight; // If provided, loops this segment
}

export interface AudioPlayerHandle {
    play: () => void;
    pause: () => void;
    togglePlay: () => void;
    seek: (time: number) => void;
    seekRelative: (seconds: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    mute: () => void;
    unmute: () => void;
}

export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(({ url, fileId, className, highlights = [], highlight, showControls = true }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const { 
        addAmbientMusicSuppression, 
        removeAmbientMusicSuppression, 
        fileProgress, 
        setFileProgress, 
        collections,
        rememberMediaVolume,
        audioVolumeByFile,
        setAudioVolumeForFile,
        hideSeekbarProgressTrail
    } = useStore(useShallow((state) => ({
        addAmbientMusicSuppression: state.addAmbientMusicSuppression,
        removeAmbientMusicSuppression: state.removeAmbientMusicSuppression,
        fileProgress: state.fileProgress,
        setFileProgress: state.setFileProgress,
        collections: state.collections,
        rememberMediaVolume: state.rememberMediaVolume,
        audioVolumeByFile: state.audioVolumeByFile,
        setAudioVolumeForFile: state.setAudioVolumeForFile,
        hideSeekbarProgressTrail: state.hideSeekbarProgressTrail,
    })));
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isLooping, setIsLooping] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        play: () => audioRef.current?.play(),
        pause: () => audioRef.current?.pause(),
        togglePlay: () => togglePlay(),
        seek: (time: number) => {
            if (audioRef.current) {
                audioRef.current.currentTime = time;
                setCurrentTime(time);
            }
        },
        seekRelative: (seconds: number) => {
            if (audioRef.current) {
                audioRef.current.currentTime += seconds;
                setCurrentTime(audioRef.current.currentTime);
            }
        },
        setVolume: (vol: number) => handleVolumeChange([vol]),
        toggleMute: () => toggleMute(),
        mute: () => {
            if (audioRef.current && !isMuted) toggleMute();
        },
        unmute: () => {
            if (audioRef.current && isMuted) toggleMute();
        }
    }));

    // Initial load progress or highlight start
    useEffect(() => {
        if (audioRef.current) {
            if (highlight) {
                audioRef.current.currentTime = highlight.start;
                setCurrentTime(highlight.start);
                setIsLooping(true); // Auto-enable loop for single highlight
            } else {
                const savedProgress = fileProgress[fileId];
                if (savedProgress) {
                    audioRef.current.currentTime = savedProgress;
                    setCurrentTime(savedProgress);
                }
            }
        }
    }, [fileId, highlight]);

    useEffect(() => {
        if (!audioRef.current) return;
        const initialVolume = rememberMediaVolume && audioVolumeByFile[fileId] !== undefined
            ? audioVolumeByFile[fileId]
            : 1;
        setVolume(initialVolume);
        setIsMuted(initialVolume === 0);
        audioRef.current.volume = initialVolume;
    }, [fileId, rememberMediaVolume, audioVolumeByFile]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(() => {});
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const time = audioRef.current.currentTime;
            
            // Highlight loop logic
            if (highlight && isLooping) {
                if (time >= (highlight.end || highlight.start + 5) || time < highlight.start) {
                    audioRef.current.currentTime = highlight.start;
                    setCurrentTime(highlight.start);
                    return;
                }
            }

            setCurrentTime(time);
            // Debounce saving progress? Or just save every few seconds
            if (!highlight && Math.abs(time - (fileProgress[fileId] || 0)) > 5) {
                setFileProgress(fileId, time);
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (value: number[]) => {
        if (audioRef.current) {
            audioRef.current.currentTime = value[0];
            setCurrentTime(value[0]);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0];
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
        if (rememberMediaVolume) {
            setAudioVolumeForFile(fileId, newVolume);
        }
        setIsMuted(newVolume === 0);
    };

    const toggleMute = () => {
        if (!audioRef.current) return;
        const newMuteState = !isMuted;
        setIsMuted(newMuteState);
        audioRef.current.muted = newMuteState;
    };

    const toggleLoop = () => {
        setIsLooping(!isLooping);
        if (audioRef.current) {
            audioRef.current.loop = !isLooping;
        }
    };

    // Use refined playback rate setter
    const handlePlaybackRateChange = (rate: number) => {
        const newRate = Math.max(0.25, Math.min(8, rate));
        setPlaybackRate(newRate);
        if (audioRef.current) {
            audioRef.current.playbackRate = newRate;
        }
    };

    const formatSeconds = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const segmentDuration = highlight ? (highlight.end || highlight.start + 5) - highlight.start : duration;
    const relativeTime = highlight ? Math.max(0, currentTime - highlight.start) : currentTime;

    return (
        <div ref={containerRef} className={cn("flex flex-col items-center justify-center h-full w-full bg-zinc-950 p-8", className)}>
            <audio
                ref={audioRef}
                src={url}
                onPlay={() => {
                    setIsPlaying(true);
                    addAmbientMusicSuppression('audio-player');
                }}
                onPause={() => {
                    setIsPlaying(false);
                    removeAmbientMusicSuppression('audio-player');
                }}
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
            />

            {/* Visualizer / Cover Art Area */}
            <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-2xl bg-zinc-900 shadow-2xl flex items-center justify-center mb-12 border border-zinc-800 overflow-hidden group">
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 opacity-50",
                    isPlaying ? "animate-pulse" : ""
                )} />
                
                {/* Animated Bars (Fake Visualizer) */}
                <div className="flex items-end justify-center gap-1 h-32 w-48">
                    {[...Array(12)].map((_, i) => (
                        <div 
                            key={i}
                            className={cn(
                                "w-2 bg-primary/80 rounded-t-sm transition-all duration-300 ease-in-out",
                                isPlaying ? "animate-music-bar" : "h-2"
                            )}
                            style={{
                                animationDelay: `${i * 0.1}s`,
                                height: isPlaying ? `${Math.random() * 100}%` : '10%'
                            }}
                        />
                    ))}
                </div>
                
                <MusicNotes weight="fill" className="absolute text-zinc-800/50 w-full h-full p-12 opacity-20" />
            </div>

            {/* Controls Container */}
            {showControls && (
                <div 
                    className="w-full max-w-2xl bg-zinc-900/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800/50 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Progress Bar */}
                    <div className="mb-6 space-y-2 relative group/seek">
                        {/* Highlights Overlay - Only show when not in highlight mode */}
                        {!highlight && highlights.length > 0 && duration > 0 && (
                            <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none z-10">
                                {highlights.map((h: Highlight) => {
                                    const collection = collections.find((c: Collection) => c.id === h.collectionId);
                                    const color = collection?.color || 'var(--primary)';
                                    const startPct = (h.start / duration) * 100;
                                    const hasRange = h.end && h.end > h.start;
                                    const widthPct = hasRange ? ((h.end! - h.start) / duration) * 100 : 0;

                                    return (
                                        <div 
                                            key={h.id}
                                            className="absolute top-1/2 -translate-y-1/2 h-3 rounded-full opacity-60 transition-opacity hover:opacity-100"
                                            style={{ 
                                                left: `${startPct}%`,
                                                width: hasRange ? `${widthPct}%` : '4px',
                                                backgroundColor: color,
                                                boxShadow: `0 0 4px ${color}`
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        )}
                        <div onClick={(e) => e.stopPropagation()}>
                            <Slider
                                value={[relativeTime]}
                                max={segmentDuration || 100}
                                step={0.1}
                                onValueChange={(val: number[]) => {
                                    const newTime = highlight ? highlight.start + val[0] : val[0];
                                    handleSeek([newTime]);
                                }}
                                className="cursor-pointer"
                                hideRange={hideSeekbarProgressTrail}
                            />
                        </div>
                        <div className="flex justify-between text-xs font-mono text-zinc-500">
                            <span>{formatSeconds(relativeTime)}</span>
                            <span>{formatSeconds(segmentDuration)}</span>
                        </div>
                    </div>

                    {/* Main Controls */}
                    <div className="flex items-center justify-between">
                        {/* Left: Volume */}
                        <div className="flex items-center gap-2 w-32" onClick={(e) => e.stopPropagation()}>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => { e.stopPropagation(); toggleMute(); }} 
                                className="text-zinc-400 hover:text-white"
                            >
                                {isMuted ? <SpeakerX size={20} /> : <SpeakerHigh size={20} />}
                            </Button>
                            <Slider
                                value={[isMuted ? 0 : volume]}
                                max={1}
                                step={0.01}
                                onValueChange={handleVolumeChange}
                                className="w-20"
                            />
                        </div>

                        {/* Center: Playback */}
                        <div className="flex items-center gap-4">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => { 
                                    e.stopPropagation();
                                    playSfx('cursor');
                                    if (audioRef.current) audioRef.current.currentTime -= 10; 
                                }}
                                className="text-zinc-400 hover:text-white flex flex-col items-center gap-0.5 h-auto py-1"
                                title="Rewind 10s"
                            >
                                <ArrowCounterClockwise size={20} weight="bold" />
                                <span className="text-[10px] font-medium leading-none">10</span>
                            </Button>

                            <Button 
                                size="icon" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    playSfx('cursor');
                                    togglePlay();
                                }}
                                className="h-14 w-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg scale-100 hover:scale-105 transition-transform"
                            >
                                {isPlaying ? <Pause size={28} weight="fill" /> : <Play size={28} weight="fill" className="ml-1" />}
                            </Button>

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => { 
                                    e.stopPropagation();
                                    playSfx('cursor');
                                    if (audioRef.current) audioRef.current.currentTime += 10; 
                                }}
                                className="text-zinc-400 hover:text-white flex flex-col items-center gap-0.5 h-auto py-1"
                                title="Skip 10s"
                            >
                                <ArrowClockwise size={20} weight="bold" />
                                <span className="text-[10px] font-medium leading-none">10</span>
                            </Button>
                        </div>

                        {/* Right: Options */}
                        <div className="flex items-center gap-2 w-32 justify-end" onClick={(e) => e.stopPropagation()}>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-xs font-bold text-zinc-400 hover:text-white w-12"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {playbackRate}x
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 bg-popover border-border p-4" side="top" portalContainer={containerRef.current}>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between text-foreground font-mono text-xl font-medium border-b border-border pb-2">
                                            <span>{playbackRate.toFixed(2)}x</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { playSfx('cursor'); handlePlaybackRateChange(playbackRate - 0.05); }}>
                                                <Minus weight="bold" />
                                            </Button>
                                            <Slider
                                                value={[playbackRate]}
                                                min={0.25}
                                                max={8}
                                                step={0.05}
                                                onValueChange={(val: number[]) => handlePlaybackRateChange(val[0])}
                                                className="flex-1"
                                            />
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { playSfx('cursor'); handlePlaybackRateChange(playbackRate + 0.05); }}>
                                                <Plus weight="bold" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 8.0].map((rate) => (
                                                <button
                                                    key={rate}
                                                    onClick={() => { playSfx('cursor'); handlePlaybackRateChange(rate); }}
                                                    className={cn(
                                                        "px-2 py-1.5 rounded text-xs font-medium transition-colors border",
                                                        playbackRate === rate
                                                            ? "bg-primary/10 text-primary border-primary/50"
                                                            : "bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground"
                                                    )}
                                                >
                                                    {rate}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => { e.stopPropagation(); playSfx('cursor'); toggleLoop(); }}
                                className={cn(
                                    "transition-colors",
                                    isLooping ? "text-primary bg-primary/10" : "text-zinc-400 hover:text-white"
                                )}
                            >
                                <Repeat size={20} />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes music-bar {
                    0% { height: 10%; }
                    50% { height: 60%; }
                    100% { height: 10%; }
                }
                .animate-music-bar {
                    animation: music-bar 0.8s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
});
