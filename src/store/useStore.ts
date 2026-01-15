import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type AppState, type File, type Project, type Collection, type Timestamp } from '@/types';

interface AppStore extends AppState {
    activeFileId: string | null; // Explicitly add if missing from AppState, or check AppState
    // Actions
    setProjects: (projects: Project[]) => void;
    setActiveProject: (id: string | null) => void;
    addProject: (name: string) => Project;

    // Generic setters (initially for migration/bulk updates)
    setState: (state: Partial<AppState>) => void;

    // Entity Actions
    addTimestamp: (fileId: string, time: number, collectionId?: string) => void;
    removeTimestamp: (id: string) => void;
    updateTimestamp: (id: string, updates: Partial<Timestamp>) => void;
    updateFile: (id: string, updates: Partial<File>) => void;
    updateCollection: (id: string, updates: Partial<Collection>) => void;
}

const STORAGE_KEY = 'whistler_v2_data';

export const useStore = create<AppStore>()(
    persist(
        (set) => ({
            projects: [],
            files: [],
            collections: [],
            timestamps: [],
            graphs: [],
            graphNodes: [],
            graphEdges: [],
            docs: [],
            storages: [],

            activeProjectId: null,
            activeStorageId: null,
            activeCollectionId: null,
            activeGraphId: null,
            activeDocId: null,
            activeFileId: null, // Added

            setProjects: (projects: Project[]) => set({ projects }),
            setFiles: (files: File[]) => set({ files }),
            setCollections: (collections: Collection[]) => set({ collections }),
            setTimestamps: (timestamps: Timestamp[]) => set({ timestamps }),
            setActiveProject: (id: string | null) => set({ activeProjectId: id }),
            setActiveFile: (id: string | null) => set({ activeFileId: id }),
            setActiveCollection: (id: string | null) => set({ activeCollectionId: id }),

            addProject: (name) => {
                const newProject: Project = {
                    id: crypto.randomUUID(),
                    name,
                    created: Date.now(),
                    lastModified: Date.now(),
                };
                set((state) => ({
                    projects: [...state.projects, newProject],
                    // Auto-select if first project
                    activeProjectId: state.projects.length === 0 ? newProject.id : state.activeProjectId
                }));
                return newProject;
            },

            addTimestamp: (fileId, time) => set((state) => {
                const collectionId = state.activeCollectionId; // Use active collection if set
                const newTimestamp: Timestamp = {
                    id: crypto.randomUUID(),
                    fileId,
                    collectionId,
                    start: time,
                    end: time + 5, // Default to 5s clip
                    note: "",
                    text: "",
                    created: Date.now()
                };
                return {
                    timestamps: [...state.timestamps, newTimestamp]
                };
            }),
            removeTimestamp: (id) => set((state) => ({
                timestamps: state.timestamps.filter((t) => t.id !== id),
            })),
            updateTimestamp: (id, updates) => set((state) => ({
                timestamps: state.timestamps.map((t) => t.id === id ? { ...t, ...updates } : t)
            })),
            updateFile: (id, updates) => set((state) => ({
                files: state.files.map((f) => {
                    if (f.id !== id) return f;
                    // Ensure type safety manually or by casting if deemed safe, 
                    // though mapping should work if updates is Partial<File>.
                    // The issue might be TS inference. Let's be explicit.
                    return { ...f, ...updates, lastModified: Date.now() } as File; // Fixed type assertion
                })
            })),
            updateCollection: (id, updates) => set((state) => ({
                collections: state.collections.map((c) => c.id === id ? { ...c, ...updates, lastModified: Date.now() } : c)
            })),

            setState: (newState) => set((state) => ({ ...state, ...newState })),
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
            // Optional: partialize or migrate if needed
        }
    )
);
