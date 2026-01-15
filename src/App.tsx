import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import StorageView from "@/components/views/StorageView";
import FileView from "@/components/views/FileView";
import DocsView from "@/components/views/DocsView";
import GraphView from "@/components/views/GraphView";
import CollectionView from "@/components/views/CollectionView";
import { GlobalKeybinds } from "@/components/GlobalKeybinds";
import { useInitialData } from "@/hooks/useInitialData";

export default function App() {
  useInitialData();
  return (
    <>
      <GlobalKeybinds />
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/storage" replace />} />
          <Route path="/storage" element={<StorageView />} />
          <Route path="/file/:fileId" element={<FileView />} />
          <Route path="/docs" element={<DocsView />} />
          <Route path="/graph" element={<GraphView />} />
          <Route path="/collections" element={<CollectionView />} />
        </Route>
      </Routes>
    </>
  );
}
