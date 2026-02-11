import { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";

const StorageView = lazy(() => import("@/components/views/StorageView"));
const FileView = lazy(() => import("@/components/views/FileView"));
const DocsView = lazy(() => import("@/components/views/DocsView"));
const GraphView = lazy(() => import("@/components/views/GraphView"));
const CollectionView = lazy(() => import("@/components/views/CollectionView"));
const CollectionsView = lazy(() => import("@/components/views/CollectionsView"));
const SettingsView = lazy(() => import("@/components/views/SettingsView"));
const HomeView = lazy(() => import("@/components/views/HomeView"));
const WelcomeView = lazy(() => import("@/components/views/WelcomeView").then(module => ({ default: module.WelcomeView })));
const LegalView = lazy(() => import("@/components/views/LegalView"));

import { GlobalKeybinds } from "@/components/GlobalKeybinds";
import { SpotlightSearch } from "@/components/SpotlightSearch";
import { DoubleTapMenu } from "@/components/DoubleTapMenu";
import { useInitialData } from "@/hooks/useInitialData";
import { useSync } from "@/hooks/useSync";

import { useStore, type AppStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import type { AccentTheme } from "@/types";

import { preloadSounds, playSfx } from "@/utils/sound";

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

export default function App() {
  const [shouldThrow, setShouldThrow] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Expose debug function to window
    (window as any).triggerError = () => setShouldThrow(true);
    return () => {
      delete (window as any).triggerError;
    };
  }, []);

  useEffect(() => {
    const removeTitles = (root: ParentNode) => {
      if (root instanceof Element && root.hasAttribute('title')) {
        root.removeAttribute('title');
      }
      root.querySelectorAll('[title]').forEach((el) => el.removeAttribute('title'));
    };

    removeTitles(document.body);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          if (mutation.target.hasAttribute('title')) {
            mutation.target.removeAttribute('title');
          }
        }
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            removeTitles(node);
          }
        });
      });
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['title'], childList: true, subtree: true });
    return () => observer.disconnect();
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


  const isLegalRoute = location.pathname.startsWith('/legal');
  const showWelcome = projects.length === 0 && !isLegalRoute;

  return (
    <>
      <GlobalKeybinds />
      <SpotlightSearch />
      <DoubleTapMenu />
      <Suspense fallback={<div className="h-screen w-screen bg-background" />}>
        {showWelcome ? (
          <WelcomeView />
        ) : (
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomeView />} />
              <Route path="/storage/:id?" element={<StorageView />} />
              <Route path="/file/:id" element={<FileView />} />
              <Route path="/docs/:id?" element={<DocsView />} />
              <Route path="/graphs/:id?" element={<GraphView />} />
              <Route path="/collection/:id" element={<CollectionView />} />
              <Route path="/collections" element={<CollectionsView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="/welcome" element={<WelcomeView />} />
              <Route path="/legal/:tab?" element={<LegalView />} />
              <Route path="*" element={<NotFoundView />} />
            </Route>
          </Routes>
        )}
      </Suspense>
    </>
  );
}
