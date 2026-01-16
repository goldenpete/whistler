import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import type { Project, File } from "@/types";
import { Plus, DownloadSimple, Lightning } from "@phosphor-icons/react";
import { importProject, type ProjectExportData } from "@/utils/projectData";

export function WelcomeView() {
    const { addProject, setProjects, setFiles, setActiveProject } = useStore();

    const handleNewProject = () => {
        const name = prompt("Project Name:"); // Ideally use a dialog
        if (name) {
            const p = addProject(name);
            setActiveProject(p.id);
        }
    };

    const handleImportProject = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const text = await file.text();
            try {
                const data = JSON.parse(text) as ProjectExportData;
                if (!data.version || !data.project) throw new Error("Invalid project file");

                const importedData = importProject(data);

                useStore.setState(state => ({
                    projects: [...state.projects, importedData.project],
                    files: [...state.files, ...importedData.files],
                    collections: [...state.collections, ...importedData.collections],
                    timestamps: [...state.timestamps, ...importedData.timestamps],
                    graphs: [...state.graphs, ...importedData.graphs],
                    graphNodes: [...state.graphNodes, ...importedData.graphNodes],
                    graphEdges: [...state.graphEdges, ...importedData.graphEdges],
                    docs: [...state.docs, ...importedData.docs],
                    storages: [...state.storages, ...importedData.storages],
                    activeProjectId: importedData.project.id
                }));
            } catch (err) {
                console.error(err);
                alert("Failed to import project.");
            }
        };
        input.click();
    };

    const handleLoadDemo = () => {
        const p1: Project = {
            id: crypto.randomUUID(),
            name: 'Demo Project',
            created: Date.now(),
            lastModified: Date.now()
        };

        const s1 = {
            id: crypto.randomUUID(),
            projectId: p1.id,
            name: 'Main Storage',
            created: Date.now(),
            lastModified: Date.now()
        };

        const f1: File = {
            id: crypto.randomUUID(),
            projectId: p1.id,
            storageId: s1.id,
            parentId: null,
            name: 'Getting Started.mp4',
            url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
            type: 'video',
            order: 0,
            created: Date.now(),
            lastModified: Date.now()
        };

        const f2: File = {
            id: crypto.randomUUID(),
            projectId: p1.id,
            storageId: s1.id,
            parentId: null,
            name: 'Project Documentation.pdf',
            url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            type: 'pdf',
            order: 1,
            created: Date.now(),
            lastModified: Date.now()
        };

        useStore.setState(state => ({
            projects: [...state.projects, p1],
            storages: [...state.storages, s1],
            files: [...state.files, f1, f2],
            activeProjectId: p1.id,
            activeStorageId: s1.id
        }));
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-white p-4">
            <div className="max-w-md w-full space-y-8 text-center">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tighter">Welcome to Whistlerbox</h1>
                    <p className="text-zinc-400">Your creative media organizer.</p>
                </div>

                <div className="grid gap-4">
                    <Button
                        onClick={handleNewProject}
                        className="h-12 text-lg bg-primary hover:bg-primary/90"
                    >
                        <Plus size={20} weight="bold" className="mr-2" />
                        Create New Project
                    </Button>

                    <Button
                        onClick={handleImportProject}
                        variant="secondary"
                        className="h-12 text-lg"
                    >
                        <DownloadSimple size={20} weight="bold" className="mr-2" />
                        Import Project JSON
                    </Button>

                    <Button
                        onClick={handleLoadDemo}
                        variant="outline"
                        className="h-12 text-lg border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white"
                    >
                        <Lightning size={20} weight="bold" className="mr-2" />
                        Load Demo Data
                    </Button>
                </div>
            </div>
        </div>
    );
}
