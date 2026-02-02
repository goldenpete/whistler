import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import StorageView from "@/components/views/StorageView";
import FileView from "@/components/views/FileView";
import DocsView from "@/components/views/DocsView";
import GraphView from "@/components/views/GraphView";
import CollectionView from "@/components/views/CollectionView";
import CollectionsView from "@/components/views/CollectionsView";
import { Button } from "@/components/ui/button";
import { GlobalKeybinds } from "@/components/GlobalKeybinds";
import { SpotlightSearch } from "@/components/SpotlightSearch";
import { useInitialData } from "@/hooks/useInitialData";
import { useSync } from "@/hooks/useSync";

import { useStore, type AppStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { WelcomeView } from "@/components/views/WelcomeView";
import type { AccentTheme } from "@/types";

import HomeView from "@/components/views/HomeView";
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

  const { projects, accentTheme, baseTheme } = useStore(useShallow((state: AppStore) => ({
    projects: state.projects,
    accentTheme: state.accentTheme,
    baseTheme: state.baseTheme,
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
      root.setAttribute("data-accent", accentTheme);
    } else {
      root.removeAttribute("data-accent");
    }
  }, [accentTheme]);

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
      root.setAttribute("data-base", baseTheme);
    } else {
      root.removeAttribute("data-base");
    }
  }, [baseTheme]);

  if (projects.length === 0) {
    return <WelcomeView />;
  }

  useInitialData(); // This is now a no-op
  return (
    <>
      <GlobalKeybinds />
      <SpotlightSearch />
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomeView />} />
          <Route path="/storage" element={<StorageView />} />
          <Route path="/file/:fileId" element={<FileView />} />
          <Route path="/docs" element={<DocsView />} />
          <Route path="/graphs" element={<GraphView />} />
          <Route path="/collections" element={<CollectionsView />} />
          <Route path="/collection/:id" element={<CollectionView />} />
          <Route path="*" element={<NotFoundView />} />
        </Route>
      </Routes>
    </>
  );
}
