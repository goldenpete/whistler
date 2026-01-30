import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
    Play, 
    Pause, 
    SpeakerHigh, 
    SpeakerLow, 
    SpeakerX, 
    Repeat, 
    FastForward, 
    Rewind,
    MusicNotesSimple,
    Waveform
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { formatTime } from '@/lib/utils'; // Assuming this helper exists, or I'll redefine it
import { useNavigate } from 'react-router-dom';

interface AudioPlayerProps {
    url: string;
    fileId: string;
    showControls?: boolean;
    className?: string;
}

export function AudioPlayer({ url, fileId, className }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const { addAmbientMusicSuppression, removeAmbientMusicSuppression, fileProgress, setFileProgress } = useStore();
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isLooping, setIsLooping] = useState(false);

    // Initial load progress
    useEffect(() => {
        if (audioRef.current) {
            const savedProgress = fileProgress[fileId];
            if (savedProgress) {
                audioRef.current.currentTime = savedProgress;
                setCurrentTime(savedProgress);
            }
        }
    }, [fileId]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const time = audioRef.current.currentTime;
            setCurrentTime(time);
            // Debounce saving progress? Or just save every few seconds
            if (Math.abs(time - (fileProgress[fileId] || 0)) > 5) {
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

    const changeSpeed = () => {
        const speeds = [0.5, 1, 1.25, 1.5, 2];
        const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
        const newRate = speeds[nextIndex];
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

    return (
        <div className={cn("flex flex-col items-center justify-center h-full w-full bg-zinc-950 p-8", className)}>
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
                
                <MusicNotesSimple weight="fill" className="absolute text-zinc-800/50 w-full h-full p-12 opacity-20" />
            </div>

            {/* Controls Container */}
            <div className="w-full max-w-2xl bg-zinc-900/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800/50 shadow-xl">
                {/* Progress Bar */}
                <div className="mb-6 space-y-2">
                    <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={1}
                        onValueChange={handleSeek}
                        className="cursor-pointer"
                    />
                    <div className="flex justify-between text-xs font-mono text-zinc-500">
                        <span>{formatSeconds(currentTime)}</span>
                        <span>{formatSeconds(duration)}</span>
                    </div>
                </div>

                {/* Main Controls */}
                <div className="flex items-center justify-between">
                    {/* Left: Volume */}
                    <div className="flex items-center gap-2 w-32">
                        <Button variant="ghost" size="icon" onClick={toggleMute} className="text-zinc-400 hover:text-white">
                            {isMuted ? <SpeakerX size={20} /> : volume > 0.5 ? <SpeakerHigh size={20} /> : <SpeakerLow size={20} />}
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
                            onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 10; }}
                            className="text-zinc-400 hover:text-white"
                        >
                            <Rewind size={24} weight="fill" />
                        </Button>

                        <Button 
                            size="icon" 
                            onClick={togglePlay}
                            className="h-14 w-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg scale-100 hover:scale-105 transition-transform"
                        >
                            {isPlaying ? <Pause size={28} weight="fill" /> : <Play size={28} weight="fill" className="ml-1" />}
                        </Button>

                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => { if (audioRef.current) audioRef.current.currentTime += 10; }}
                            className="text-zinc-400 hover:text-white"
                        >
                            <FastForward size={24} weight="fill" />
                        </Button>
                    </div>

                    {/* Right: Options */}
                    <div className="flex items-center gap-2 w-32 justify-end">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={changeSpeed}
                            className="text-xs font-bold text-zinc-400 hover:text-white w-12"
                        >
                            {playbackRate}x
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={toggleLoop}
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
}
