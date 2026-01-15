import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { File } from '@/types';

export function useInitialData() {
    const { projects } = useStore();

    useEffect(() => {
        if (projects.length === 0) {
            console.log("Seeding initial data...");
            const p1 = {
                id: crypto.randomUUID(),
                name: 'Demo Project',
                created: Date.now(),
                lastModified: Date.now()
            };

            const f1: File = {
                id: crypto.randomUUID(),
                projectId: p1.id,
                storageId: 'local',
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
                storageId: 'local',
                parentId: null,
                name: 'Project Documentation.pdf',
                url: null,
                type: 'pdf',
                order: 1,
                created: Date.now(),
                lastModified: Date.now()
            };

            useStore.setState({
                projects: [p1],
                files: [f1, f2],
                activeProjectId: p1.id
            });
        }
    }, [projects.length]);
}
