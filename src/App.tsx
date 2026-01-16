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

export default function App() {
  const { projects } = useStore();

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
          <Route path="/" element={<Navigate to="/storage" replace />} />
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
