import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

const SYNC_API_URL = "https://whistler-sync.peteawesome.workers.dev";

export function useSync() {
    const { 
        setLastSyncTime, 
        setState, 
        setSyncStatus,
        syncStatus,
        user,
        logout,
        autoSyncEnabled,
        autoSyncInterval
    } = useStore();
    const [error, setError] = useState<string | null>(null);
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const handleSync = useCallback(async (type: 'push' | 'pull', silent = false) => {
        const storedToken = localStorage.getItem("whistler_session_token");
        const storedAccountId = localStorage.getItem("whistler_account_id");

        if (!storedAccountId || !storedToken) {
            if (!silent) setError("Connect with your Sync ID first");
            return;
        }

        if (!silent) setSyncStatus("syncing");
        setError(null);

        try {
            if (type === "push") {
                const state = useStore.getState();
                const data = {
                    projects: state.projects,
                    files: state.files,
                    collections: state.collections,
                    highlights: state.highlights,
                    graphs: state.graphs,
                    graphNodes: state.graphNodes,
                    graphEdges: state.graphEdges,
                    docs: state.docs,
                    storages: state.storages,
                    // Theme Settings
                    accentTheme: state.accentTheme,
                    baseTheme: state.baseTheme,
                    enableDefaultColorControls: state.enableDefaultColorControls,
                    defaultColors: state.defaultColors,
                    // Background Settings
                    backgroundImageUrl: state.backgroundImageUrl,
                    backgroundImageOpacity: state.backgroundImageOpacity,
                    backgroundColor: state.backgroundColor,
                    backgroundOverlayOpacity: state.backgroundOverlayOpacity,
                    
                    lastModified: Date.now(),
                };
                
                const payload = JSON.stringify({
                    key: "whistler_data",
                    value: data,
                });
                
                if (!silent) {
                    console.log(`Syncing (Push) for account ${storedAccountId}`);
                    console.log(`Payload size: approx ${Math.round(payload.length / 1024)} KB`);
                }

                const response = await fetch(`${SYNC_API_URL}/data`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${storedToken}`,
                    },
                    body: payload,
                });
                
                if (response.status === 401) {
                    console.error("Sync Push 401 Unauthorized");
                    // Only logout if explicit action, or maybe just stop auto-sync?
                    // For now, let's keep behavior consistent
                    logout();
                    setError("Session expired. Please sign in again.");
                    setSyncStatus("error");
                    return;
                }
                
                if (!response.ok) {
                    const body = await response.json().catch(() => null);
                    console.error("Push Error Body:", body);
                    setError(body?.error || "Push failed");
                    setSyncStatus("error");
                    return;
                }
                if (!silent) console.log("Push Successful");
            } else {
                if (!silent) console.log(`Syncing (Pull) for account ${storedAccountId}`);
                
                const response = await fetch(`${SYNC_API_URL}/data`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${storedToken}`,
                    },
                });

                if (response.status === 401) {
                    console.error("Sync Pull 401 Unauthorized");
                    logout();
                    setError("Session expired. Please sign in again.");
                    setSyncStatus("error");
                    return;
                }

                if (!response.ok) {
                    const body = await response.json().catch(() => null);
                    console.error("Pull Error Body:", body);
                    setError(body?.error || "Pull failed");
                    setSyncStatus("error");
                    return;
                }

                const result = await response.json();
                
                const dataRow = Array.isArray(result.data)
                    ? result.data.find((d: any) => d.key === "whistler_data")
                    : null;

                if (dataRow && dataRow.value) {
                    const cloudData = typeof dataRow.value === "string" ? JSON.parse(dataRow.value) : dataRow.value;
                    if (!silent) console.log(`Restoring Cloud Data...`);
                    
                    setState({
                        projects: cloudData.projects || [],
                        files: cloudData.files || [],
                        collections: cloudData.collections || [],
                        highlights: cloudData.highlights || [],
                        graphs: cloudData.graphs || [],
                        graphNodes: cloudData.graphNodes || [],
                        graphEdges: cloudData.graphEdges || [],
                        docs: cloudData.docs || [],
                        storages: cloudData.storages || [],
                        history: cloudData.history || [],
                        // Theme Settings
                        accentTheme: cloudData.accentTheme || 'orange',
                        baseTheme: cloudData.baseTheme || 'zinc',
                        enableDefaultColorControls: cloudData.enableDefaultColorControls || false,
                        defaultColors: cloudData.defaultColors || {
                            file: '#f59e0b',
                            collection: '#f59e0b',
                            storage: '#f59e0b',
                            graph: '#f59e0b',
                            node: '#f59e0b',
                        },
                        // Background Settings
                        backgroundImageUrl: cloudData.backgroundImageUrl ?? null,
                        backgroundImageOpacity: cloudData.backgroundImageOpacity ?? 0.2,
                        backgroundColor: cloudData.backgroundColor ?? '#000000',
                        backgroundOverlayOpacity: cloudData.backgroundOverlayOpacity ?? 0.5,
                    });
                } else {
                    if (!silent) console.log("No matching data row found in pull result.");
                }
            }

            const now = Date.now();
            setLastSyncTime(now);
            localStorage.setItem("whistler_last_sync", String(now));
            
            if (!silent) {
                setSyncStatus("success");
                setTimeout(() => setSyncStatus("idle"), 2000);
            } else {
                setSyncStatus("idle");
            }
        } catch (err) {
            console.error("Sync error:", err);
            setError(err instanceof Error ? err.message : "Sync error");
            setSyncStatus("error");
        }
    }, [logout, setLastSyncTime, setState, setSyncStatus]);

    // Auto-sync Logic
    useEffect(() => {
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }

        if (autoSyncEnabled && user) {
            // Initial sync on load? Maybe not, too aggressive.
            // Just set interval.
            syncIntervalRef.current = window.setInterval(() => {
                if (syncStatus === 'idle') {
                    handleSync('push', true);
                }
            }, autoSyncInterval);
        }

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, [autoSyncEnabled, user, autoSyncInterval, handleSync, syncStatus]);

    return { handleSync, error };
}
