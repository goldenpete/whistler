import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import StorageView from "@/components/views/StorageView";
import FileView from "@/components/views/FileView";
import DocsView from "@/components/views/DocsView";
import GraphView from "@/components/views/GraphView";
import CollectionView from "@/components/views/CollectionView";
import { GlobalKeybinds } from "@/components/GlobalKeybinds";
import { SpotlightSearch } from "@/components/SpotlightSearch";
import { useInitialData } from "@/hooks/useInitialData";

import { useNavigate } from "react-router-dom"; // unused if we render conditional
import { useStore } from "@/store/useStore";
import { WelcomeView } from "@/components/views/WelcomeView";
import type { AccentTheme } from "@/types";

import HomeView from "@/components/views/HomeView";

export default function App() {
  const { projects, accentTheme, baseTheme } = useStore();

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
          <Route path="/collections" element={<CollectionView />} />
        </Route>
      </Routes>
    </>
  );
}
