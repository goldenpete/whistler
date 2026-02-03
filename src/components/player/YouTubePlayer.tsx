import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

interface YouTubePlayerProps {
    url: string;
    className?: string;
    onTimeUpdate?: (currentTime: number) => void;
    onDurationChange?: (duration: number) => void;
    onEnded?: () => void;
    onPlay?: () => void;
    onPause?: () => void;
    onClick?: () => void;
    initialTime?: number;
}

export interface YouTubePlayerHandle {
    play: () => Promise<void>;
    pause: () => void;
    currentTime: number;
    duration: number;
    volume: number;
    muted: boolean;
    playbackRate: number;
    paused: boolean;
}

function getYouTubeId(url: string) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

export const YouTubePlayerComponent = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(({ 
    url, 
    className,
    onTimeUpdate,
    onDurationChange,
    onEnded,
    onPlay,
    onPause,
    onClick,
    initialTime = 0
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const [isReady, setIsReady] = useState(false);
    const videoId = getYouTubeId(url);
    const timeUpdateInterval = useRef<ReturnType<typeof setInterval>>(null);

    // Load API
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
            
            window.onYouTubeIframeAPIReady = () => {
                // Trigger re-render to start player creation
                setIsReady(true);
            };
        } else {
            setIsReady(true);
        }
    }, []);

    // Initialize Player
    useEffect(() => {
        if (!isReady || !videoId || !containerRef.current) return;

        // If player already exists and video ID changed, load new video
        if (playerRef.current) {
            if (playerRef.current.getVideoData && playerRef.current.getVideoData().video_id !== videoId) {
                playerRef.current.loadVideoById(videoId, initialTime);
            }
            return;
        }

        const playerDiv = document.createElement('div');
        playerDiv.style.width = '100%';
        playerDiv.style.height = '100%';
        containerRef.current.appendChild(playerDiv);

        playerRef.current = new window.YT.Player(playerDiv, {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'playsinline': 1,
                'controls': 0, // We want custom controls, but for now we might need them? No, design has custom controls.
                'disablekb': 1,
                'rel': 0,
                'modestbranding': 1,
                'start': initialTime
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
            }
        });

        return () => {
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch (e) {
                    console.error("Error destroying YT player", e);
                }
                playerRef.current = null;
            }
        };
    }, [isReady, videoId]);

    const onPlayerReady = (event: any) => {
        if (onDurationChange) {
            onDurationChange(event.target.getDuration());
        }
    };

    const onPlayerStateChange = (event: any) => {
        // YT.PlayerState.ENDED = 0
        // YT.PlayerState.PLAYING = 1
        // YT.PlayerState.PAUSED = 2
        
        if (event.data === window.YT.PlayerState.PLAYING) {
            if (onPlay) onPlay();
            startTimeUpdate();
        } else {
            if (event.data === window.YT.PlayerState.PAUSED) {
                if (onPause) onPause();
            } else if (event.data === window.YT.PlayerState.ENDED) {
                if (onEnded) onEnded();
            }
            stopTimeUpdate();
        }
    };

    const startTimeUpdate = () => {
        stopTimeUpdate();
        timeUpdateInterval.current = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime && onTimeUpdate) {
                onTimeUpdate(playerRef.current.getCurrentTime());
            }
        }, 100);
    };

    const stopTimeUpdate = () => {
        if (timeUpdateInterval.current) {
            clearInterval(timeUpdateInterval.current);
            timeUpdateInterval.current = null;
        }
    };

    // Expose Handle
    useImperativeHandle(ref, () => ({
        play: async () => {
            if (playerRef.current) playerRef.current.playVideo();
        },
        pause: () => {
            if (playerRef.current) playerRef.current.pauseVideo();
        },
        get currentTime() {
            return playerRef.current ? playerRef.current.getCurrentTime() : 0;
        },
        set currentTime(time: number) {
            if (playerRef.current) playerRef.current.seekTo(time, true);
        },
        get duration() {
            return playerRef.current ? playerRef.current.getDuration() : 0;
        },
        get volume() {
            return playerRef.current ? playerRef.current.getVolume() / 100 : 1;
        },
        set volume(vol: number) {
            if (playerRef.current) playerRef.current.setVolume(vol * 100);
        },
        get muted() {
            return playerRef.current ? playerRef.current.isMuted() : false;
        },
        set muted(mute: boolean) {
            if (playerRef.current) {
                if (mute) playerRef.current.mute();
                else playerRef.current.unMute();
            }
        },
        get playbackRate() {
            return playerRef.current ? playerRef.current.getPlaybackRate() : 1;
        },
        set playbackRate(rate: number) {
            if (playerRef.current) playerRef.current.setPlaybackRate(rate);
        },
        get paused() {
            return playerRef.current ? playerRef.current.getPlayerState() !== window.YT.PlayerState.PLAYING : true;
        }
    }));

    // Overlay to handle clicks
    return (
        <div className={className} style={{ position: 'relative' }}>
            <div ref={containerRef} className="w-full h-full" />
            {/* Click overlay for play/pause if needed, but the iframe intercepts clicks usually. 
                We might need a transparent overlay if we want to handle clicks ourselves. 
                For now, let's let YouTube handle clicks or use the parent's onClick via an overlay.
            */}
            {onClick && (
                <div 
                    style={{ 
                        position: 'absolute', 
                        inset: 0, 
                        zIndex: 10, 
                        // pointerEvents: 'none' // If we want to interact with YT controls, this must be none.
                        // But if controls are hidden, we might want to capture clicks.
                    }} 
                    onClick={onClick}
                />
            )}
        </div>
    );
});
