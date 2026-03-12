/**
 * ─── App.tsx ──────────────────────────────────────────────────────────────────
 *
 * Root component of the Whistler application.
 *
 * Responsibilities:
 *   1. Defines all routes (React Router v7) with lazy-loaded view components
 *   2. Initializes global SFX (click sounds via delegated event listener)
 *   3. Applies the active accent & base theme to <html> via CSS custom props
 *   4. Swaps favicon to match the accent color
 *   5. Mounts global overlays: SpotlightSearch, DoubleTapMenu, GlobalKeybinds
 *   6. Starts the cloud sync hook (useSync)
 *
 * Route map:
 *   /                → HomeView (or WelcomeView if no projects)
 *   /welcome         → WelcomeView (onboarding)
 *   /storage/:id?    → StorageView (file browser inside a storage)
 *   /file/:id        → FileView (media player – video/audio/pdf/image)
 *   /docs/:id?       → DocsView (rich-text editor)
 *   /graphs/:id?     → GraphView (node-edge canvas)
 *   /collection/:id  → CollectionView (single collection viewer)
 *   /collections     → CollectionsView (collection tree browser)
 *   /settings        → SettingsView (app configuration)
 *   /legal/:tab?     → LegalView (privacy, terms)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";

// ── Retry wrapper for lazy imports (handles stale chunks after deploy) ───────
function lazyRetry<T extends { default: React.ComponentType<any> }>(
    factory: () => Promise<T>
): React.LazyExoticComponent<T["default"]> {
    return lazy(() =>
        factory().catch((err) => {
            // If chunk failed, try one reload to get fresh assets
            const key = "lazyRetryReloaded";
            if (!sessionStorage.getItem(key)) {
                sessionStorage.setItem(key, "1");
                window.location.reload();
                return new Promise(() => {}); // never resolves — page is reloading
            }
            sessionStorage.removeItem(key);
            throw err;
        })
    );
}

// ── Lazy-loaded view components (code-split per route) ───────────────────────
const StorageView = lazyRetry(() => import("@/components/views/StorageView"));
const FileView = lazyRetry(() => import("@/components/views/FileView"));
const DocsView = lazyRetry(() => import("@/components/views/DocsView"));
const GraphView = lazyRetry(() => import("@/components/views/GraphView"));
const CollectionView = lazyRetry(() => import("@/components/views/CollectionView"));
const CollectionsView = lazyRetry(() => import("@/components/views/CollectionsView"));
const SettingsView = lazyRetry(() => import("@/components/views/SettingsView"));
const HomeView = lazyRetry(() => import("@/components/views/HomeView"));
const WelcomeView = lazy(() =>
    import("@/components/views/WelcomeView")
        .then(m => ({ default: m.WelcomeView }))
        .catch((err) => {
            const key = "lazyRetryReloaded";
            if (!sessionStorage.getItem(key)) {
                sessionStorage.setItem(key, "1");
                window.location.reload();
                return new Promise(() => {}) as never;
            }
            sessionStorage.removeItem(key);
            throw err;
        })
);
const LegalView = lazyRetry(() => import("@/components/views/LegalView"));

import { GlobalKeybinds } from "@/components/features/GlobalKeybinds";
import { SpotlightSearch } from "@/components/features/SpotlightSearch";
import { DoubleTapMenu } from "@/components/features/DoubleTapMenu";
import { useInitialData } from "@/hooks/useInitialData";
import { useSync } from "@/hooks/useSync";

import { useStore, type AppStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import type { AccentTheme } from "@/types";

import { preloadSounds, playSfx } from "@/utils/sound";
import { GlobalErrorBoundary } from "@/components/ui/global-error-boundary";
import { TooltipProvider } from "@/components/ui/tooltip";

const NotFoundView = () => {
  const navigate = useNavigate();
  useEffect(() => {
    playSfx('error');
  }, []);
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center justify-center text-red-400 gap-2 h-full">
        <span className="text-lg font-medium">Page not found</span>
        <span className="text-sm text-white/50">The page you’re looking for doesn’t exist.</span>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          Back to home
        </Button>
      </div>
    </div>
  );
};

/**
 * Main application component.
 * Manages theme application, SFX initialization, routing, and global overlays.
 */
export default function App() {
  const [shouldThrow, setShouldThrow] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) {
      // Expose debug function to window only in development
      (window as any).triggerError = () => setShouldThrow(true);
      return () => {
        delete (window as any).triggerError;
      };
    }
  }, []);

  if (shouldThrow) {
    throw new Error("Test error triggered manually via console");
  }

  const { projects, accentTheme, customAccentThemes, baseTheme, customBaseThemes } = useStore(useShallow((state: AppStore) => ({
    projects: state.projects,
    accentTheme: state.accentTheme,
    customAccentThemes: state.customAccentThemes,
    baseTheme: state.baseTheme,
    customBaseThemes: state.customBaseThemes,
  })));
  useSync();

  // ── Global SFX: attach a delegated click listener to play UI sounds ──────
  // Uses data attributes to override default sound:
  //   data-sound-confirm  → plays 'confirm' sound
  //   data-sound-back     → plays 'back' sound
  //   data-no-sfx         → suppresses click sound entirely
  useEffect(() => {
    preloadSounds();

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactive = target.closest('button, a, [role="button"], input, select, textarea, .cursor-pointer');

      if (!interactive) return;

      // Check for specific overrides
      if (interactive.hasAttribute('data-sound-confirm')) {
        playSfx('confirm');
      } else if (interactive.hasAttribute('data-sound-back')) {
        playSfx('back');
      } else if (!interactive.hasAttribute('data-no-sfx')) {
        playSfx('cursor');
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // ── Apply accent theme: sets CSS custom properties or data-accent attribute ──
  useEffect(() => {
    const root = document.documentElement;
    if (accentTheme) {
      if (accentTheme.startsWith('custom-accent-')) {
        const customTheme = customAccentThemes?.[accentTheme];
        if (customTheme) {
          Object.entries(customTheme.colors).forEach(([key, value]) => {
            root.style.setProperty(key, value);
            // Also set sidebar variants if not explicitly handled
            if (key === '--primary') root.style.setProperty('--sidebar-primary', value);
            if (key === '--primary-foreground') root.style.setProperty('--sidebar-primary-foreground', value);
            if (key === '--accent') root.style.setProperty('--sidebar-accent', value);
            if (key === '--accent-foreground') root.style.setProperty('--sidebar-accent-foreground', value);
          });
          root.removeAttribute("data-accent");
        }
      } else {
        ['--primary', '--primary-foreground', '--accent', '--accent-foreground', '--sidebar-primary', '--sidebar-primary-foreground', '--sidebar-accent', '--sidebar-accent-foreground'].forEach(prop => {
          root.style.removeProperty(prop);
        });
        root.setAttribute("data-accent", accentTheme);
      }
    } else {
      root.removeAttribute("data-accent");
      ['--primary', '--primary-foreground', '--accent', '--accent-foreground', '--sidebar-primary', '--sidebar-primary-foreground', '--sidebar-accent', '--sidebar-accent-foreground'].forEach(prop => {
        root.style.removeProperty(prop);
      });
    }
  }, [accentTheme, customAccentThemes]);

  // ── Swap favicon to match accent color ─────────────────────────────────────
  useEffect(() => {
    const map: Partial<Record<AccentTheme, string>> = {
      emerald: "whistler-green-favicon",
      violet: "whistler-violet-favicon",
      sky: "whistler-blue-favicon",
      orange: "whistler-orange-favicon",
    };

    const folder = accentTheme ? map[accentTheme as AccentTheme] : undefined;

    const setHref = (selector: string, href: string) => {
      const link = document.querySelector<HTMLLinkElement>(selector);
      if (link) {
        link.href = href;
      }
    };

    const basePath = folder ? `/favicons/${folder}` : "";

    setHref(
      'link[rel="apple-touch-icon"]',
      folder ? `${basePath}/apple-touch-icon.png` : "/apple-touch-icon.png",
    );
    setHref(
      'link[rel="icon"][sizes="32x32"]',
      folder ? `${basePath}/favicon-32x32.png` : "/favicon-32x32.png",
    );
    setHref(
      'link[rel="icon"][sizes="16x16"]',
      folder ? `${basePath}/favicon-16x16.png` : "/favicon-16x16.png",
    );
    setHref(
      'link[rel="icon"]:not([sizes])',
      folder ? `${basePath}/favicon.ico` : "/favicon.ico",
    );
    setHref(
      'link[rel="manifest"]',
      folder ? `${basePath}/site.webmanifest` : "/site.webmanifest",
    );
  }, [accentTheme]);

  // ── Apply base (neutral) theme: sets CSS custom properties or data-base ────
  useEffect(() => {
    const root = document.documentElement;
    if (baseTheme) {
      if (baseTheme.startsWith('custom-')) {
        const customTheme = customBaseThemes?.[baseTheme];
        if (customTheme) {
          Object.entries(customTheme.colors).forEach(([key, value]) => {
            root.style.setProperty(key, value);
          });
          root.removeAttribute("data-base");
        }
      } else {
        ['--background', '--foreground', '--card', '--sidebar', '--sidebar-foreground', '--border', '--muted-foreground'].forEach(prop => {
          root.style.removeProperty(prop);
        });
        root.setAttribute("data-base", baseTheme);
      }
    } else {
      root.removeAttribute("data-base");
      ['--background', '--foreground', '--card', '--sidebar', '--sidebar-foreground', '--border', '--muted-foreground'].forEach(prop => {
        root.style.removeProperty(prop);
      });
    }
  }, [baseTheme, customBaseThemes]);


  return (
    <TooltipProvider>
      <GlobalKeybinds />
      <SpotlightSearch />
      <DoubleTapMenu />
      <Suspense fallback={<div className="h-screen w-screen bg-background" />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={projects.length === 0 ? <WelcomeView /> : <HomeView />} />
            <Route path="/welcome" element={<WelcomeView />} />
            <Route path="/storage/:id?" element={<StorageView />} />
            <Route path="/file/:id" element={<FileView />} />
            <Route path="/docs/:id?" element={<DocsView />} />
            <Route path="/graphs/:id?" element={<GraphView />} />
            <Route path="/collection/:id" element={<CollectionView />} />
            <Route path="/collections" element={<CollectionsView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/settings/legal/:tab?" element={<SettingsView />} />
            <Route path="/legal/:tab?" element={<LegalView />} />
            <Route path="*" element={<NotFoundView />} />
          </Route>
        </Routes>
      </Suspense>
    </TooltipProvider>
  );
}
