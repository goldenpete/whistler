/**
 * ============================================================================
 * PLAYBACK SLICE
 * ============================================================================
 *
 * Manages media playback state: PiP (Picture-in-Picture), floating player
 * windows, per-file video/audio settings, zoom levels, volume, and cache.
 * ============================================================================
 */

import type { StoreSet, StoreGet } from '../types';
import type { FloatingPlayerWindow } from '@/types';

export const createPlaybackSlice = (set: StoreSet, _get: StoreGet) => ({
  /* ── PiP State ────────────────────────────────────────────────────────── */

  /** File ID currently shown in PiP */
  pipFileId: null as string | null,
  /** Whether PiP overlay is visible */
  isPipOpen: false,
  /** Per-file playback position in seconds (fileId → seconds) */
  fileProgress: {} as Record<string, number>,

  /* ── Floating Player Windows ──────────────────────────────────────────── */

  /** Array of floating player window instances */
  floatingPlayerWindows: [] as FloatingPlayerWindow[],

  /* ── Video/Audio Settings ─────────────────────────────────────────────── */

  /** Per-file zoom level (fileId → zoom multiplier) */
  videoZoomByFile: {} as Record<string, number>,
  /** Whether zoom was set manually (vs auto-fit) per file */
  videoZoomManualByFile: {} as Record<string, boolean>,
  /** Mute new videos by default until user explicitly unmutes */
  muteNewVideosUntilUnmuted: true,
  /** Mute highlights by default until user unmutes */
  muteHighlightsUntilUnmuted: false,
  /** Always show the mute indicator overlay on videos */
  alwaysShowMuteOverlay: false,
  /** Browser-restricted Google Drive API key for native Drive playback */
  googleDriveApiKey: '',
  /** Cache Google Drive file blobs in IndexedDB to reduce API quota usage */
  googleDriveCacheEnabled: true,
  /** Remember per-file volume across sessions */
  rememberMediaVolume: false,
  /** Disable auto-play when opening media files */
  disableMediaAutoplay: false,
  /** Per-file video volume (fileId → 0.0-1.0) */
  videoVolumeByFile: {} as Record<string, number>,
  /** Per-file audio volume (fileId → 0.0-1.0) */
  audioVolumeByFile: {} as Record<string, number>,
  /** Per-file unmuted state (fileId → boolean) */
  videoUnmutedByFile: {} as Record<string, boolean>,
  /** Use middle frame for video preview thumbnails instead of first frame */
  useMiddleFrameForPreviews: true,

  /* ── Cache Settings ───────────────────────────────────────────────────── */

  /** Cache file data for faster loading */
  cacheFiles: true,
  /** Cache collection metadata */
  cacheCollections: true,
  /** Cache highlight data */
  cacheHighlights: true,

  /* ── PiP Actions ──────────────────────────────────────────────────────── */

  setPipFile: (id: string | null) => set({ pipFileId: id, isPipOpen: !!id }),
  togglePip: (isOpen: boolean) => set({ isPipOpen: isOpen }),
  setFileProgress: (fileId: string, time: number) =>
    set((state) => ({
      fileProgress: { ...state.fileProgress, [fileId]: time },
    })),

  /* ── Floating Player Actions ──────────────────────────────────────────── */

  /** Open a new floating player window for a file. Returns the window ID. */
  addFloatingPlayer: (id: string) => {
    const windowId = crypto.randomUUID();
    set((state) => ({
      floatingPlayerWindows: [
        ...state.floatingPlayerWindows,
        { id: windowId, fileId: id, minimized: false },
      ],
    }));
    return windowId;
  },

  removeFloatingPlayer: (id: string) =>
    set((state) => ({
      floatingPlayerWindows: state.floatingPlayerWindows.filter((w) => w.id !== id),
    })),

  setFloatingPlayerMinimized: (id: string, minimized: boolean) =>
    set((state) => ({
      floatingPlayerWindows: state.floatingPlayerWindows.map((w) =>
        w.id === id ? { ...w, minimized } : w
      ),
    })),

  /** Move a floating player to the top of the z-order stack */
  bringFloatingPlayerToFront: (id: string) =>
    set((state) => {
      const target = state.floatingPlayerWindows.find((w) => w.id === id);
      if (!target) return state;
      return {
        floatingPlayerWindows: [
          ...state.floatingPlayerWindows.filter((w) => w.id !== id),
          target,
        ],
      };
    }),

  /* ── Video/Audio Setting Actions ──────────────────────────────────────── */

  setVideoZoomForFile: (fileId: string, zoom: number) =>
    set((state) => ({
      videoZoomByFile: { ...(state.videoZoomByFile || {}), [fileId]: zoom },
    })),

  setVideoZoomManualForFile: (fileId: string, manual: boolean) =>
    set((state) => ({
      videoZoomManualByFile: { ...(state.videoZoomManualByFile || {}), [fileId]: manual },
    })),

  setMuteNewVideosUntilUnmuted: (enabled: boolean) => set({ muteNewVideosUntilUnmuted: enabled }),
  setMuteHighlightsUntilUnmuted: (enabled: boolean) => set({ muteHighlightsUntilUnmuted: enabled }),
  setAlwaysShowMuteOverlay: (enabled: boolean) => set({ alwaysShowMuteOverlay: enabled }),
  setGoogleDriveApiKey: (apiKey: string) => set({ googleDriveApiKey: apiKey.trim() }),
  setGoogleDriveCacheEnabled: (enabled: boolean) => set({ googleDriveCacheEnabled: enabled }),
  setRememberMediaVolume: (enabled: boolean) => set({ rememberMediaVolume: enabled }),
  setDisableMediaAutoplay: (enabled: boolean) => set({ disableMediaAutoplay: enabled }),

  setVideoVolumeForFile: (fileId: string, volume: number) =>
    set((state) => ({
      videoVolumeByFile: { ...(state.videoVolumeByFile || {}), [fileId]: volume },
    })),

  setAudioVolumeForFile: (fileId: string, volume: number) =>
    set((state) => ({
      audioVolumeByFile: { ...(state.audioVolumeByFile || {}), [fileId]: volume },
    })),

  setVideoUnmutedForFile: (fileId: string, unmuted: boolean) =>
    set((state) => ({
      videoUnmutedByFile: { ...(state.videoUnmutedByFile || {}), [fileId]: unmuted },
    })),

  setUseMiddleFrameForPreviews: (enabled: boolean) => set({ useMiddleFrameForPreviews: enabled }),
  setCacheFiles: (enabled: boolean) => set({ cacheFiles: enabled }),
  setCacheCollections: (enabled: boolean) => set({ cacheCollections: enabled }),
  setCacheHighlights: (enabled: boolean) => set({ cacheHighlights: enabled }),

  /** Clear all saved per-file volume settings */
  clearMediaVolumes: () => set({ videoVolumeByFile: {}, audioVolumeByFile: {} }),
});
