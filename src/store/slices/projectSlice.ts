/**
 * ============================================================================
 * PROJECT SLICE
 * ============================================================================
 *
 * Handles project-level CRUD: creating projects (with default storage + bucket),
 * updating project metadata, and deleting projects (cascading cleanup).
 * ============================================================================
 */

import type { StoreSet, StoreGet } from '../types';
import type { Project, Collection, File } from '@/types';

export const createProjectSlice = (set: StoreSet, _get: StoreGet) => ({
  /**
   * Create a new project with a default storage and "Collections" bucket.
   * If this is the first project, it becomes the active project automatically.
   */
  addProject: (name: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      created: Date.now(),
      lastModified: Date.now(),
    };

    // Create default storage container for the project
    const defaultStorage = {
      id: crypto.randomUUID(),
      projectId: newProject.id,
      name: 'Main Storage',
      created: Date.now(),
      lastModified: Date.now(),
    };

    // Create default "Collections" bucket (root collection container)
    const defaultBucket: Collection = {
      id: crypto.randomUUID(),
      projectId: newProject.id,
      parentId: null,
      name: 'Collections',
      color: '#71717a', // grey (zinc-500)
      icon: 'FolderOpen',
      type: 'bucket',
      order: 0,
      created: Date.now(),
      lastModified: Date.now(),
    };

    set((state) => ({
      projects: [...state.projects, newProject],
      storages: [...state.storages, defaultStorage],
      collections: [...state.collections, defaultBucket],
      // Auto-select if this is the first project
      activeProjectId: state.projects.length === 0 ? newProject.id : state.activeProjectId,
      activeStorageId: state.projects.length === 0 ? defaultStorage.id : state.activeStorageId,
      activeCollectionId: state.projects.length === 0 ? defaultBucket.id : state.activeCollectionId,
      // Log history
      history: [
        {
          id: crypto.randomUUID(),
          projectId: newProject.id,
          action: 'create',
          entityType: 'project',
          entityId: newProject.id,
          entityName: name,
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    }));
    return newProject;
  },

  /** Update project metadata (name, etc.) */
  updateProject: (id: string, updates: Partial<Project>) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, lastModified: Date.now() } : p
      ),
      history: [
        {
          id: crypto.randomUUID(),
          projectId: id,
          action: 'update',
          entityType: 'project',
          entityId: id,
          entityName: state.projects.find((p) => p.id === id)?.name,
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    })),

  /**
   * Permanently delete a project and ALL its associated data:
   * files, collections, graphs, docs, storages, highlights, nodes, edges.
   * Switches active project to next available project.
   */
  deleteProject: (id: string) =>
    set((state) => {
      const remainingProjects = state.projects.filter((p) => p.id !== id);
      const deletedProject = state.projects.find((p) => p.id === id) || null;
      const remainingProjectId = remainingProjects[0]?.id || null;

      // Collect IDs of all entities that belong to this project
      const projectFileIds = new Set(
        state.files.filter((f: File) => f.projectId === id).map((f: File) => f.id)
      );
      const projectCollectionIds = new Set(
        state.collections.filter((c: Collection) => c.projectId === id).map((c: Collection) => c.id)
      );
      const projectGraphIds = new Set(
        state.graphs.filter((g) => g.projectId === id).map((g) => g.id)
      );

      return {
        projects: remainingProjects,
        files: state.files.filter((f: File) => f.projectId !== id),
        collections: state.collections.filter((c: Collection) => c.projectId !== id),
        graphs: state.graphs.filter((g) => g.projectId !== id),
        docs: state.docs.filter((d) => d.projectId !== id),
        storages: state.storages.filter((s) => s.projectId !== id),
        highlights: state.highlights.filter(
          (h) =>
            !projectFileIds.has(h.fileId) &&
            !(h.collectionId && projectCollectionIds.has(h.collectionId))
        ),
        graphNodes: state.graphNodes.filter((n) => !projectGraphIds.has(n.graphId)),
        graphEdges: state.graphEdges.filter((e) => !projectGraphIds.has(e.graphId)),
        // Switch to next available project
        activeProjectId: remainingProjectId,
        activeStorageId: remainingProjectId
          ? state.storages.find((s) => s.projectId === remainingProjectId)?.id || null
          : null,
        activeCollectionId: null,
        activeGraphId: null,
        activeDocId: null,
        history: [
          {
            id: crypto.randomUUID(),
            projectId: id,
            action: 'delete',
            entityType: 'project',
            entityId: id,
            entityName: deletedProject?.name,
            details: 'Delete Project',
            timestamp: Date.now(),
          },
          ...state.history,
        ],
      };
    }),
});
