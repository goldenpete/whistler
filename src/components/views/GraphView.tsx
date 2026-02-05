import React, { useRef, useState, useEffect, useCallback, type MouseEvent, type WheelEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useShallow } from "@/lib/zustand-shallow";
import { useStore, type AppStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { useKeybind } from "@/hooks/use-keybind";
import {
    Plus, Circle,
    Note, File, Folder, Clock, Link as LinkIcon,
    NotePencil,
    MagnifyingGlassPlus, MagnifyingGlassMinus, PencilSimple, Trash, ArrowsOutSimple
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { GraphNode, GraphEdge, Graph, Highlight } from "@/types";
import { NodeDialog } from "@/components/dialogs/EditNodeDialog";
import { NodePreviewCard } from "@/components/graph/NodePreviewCard";
import { iconMap } from "@/utils/iconMap";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useNavigate } from "react-router-dom";

const NODE_RADIUS = 18;
const COLORS = ["#f97316", "#8b5cf6", "#10b981", "#3b82f6", "#ef4444", "#eab308"];
const GRAPH_VIEW_KEY_PREFIX = "graph_view_";

export default function GraphView() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imagesRef = useRef<Record<string, HTMLImageElement>>({});
    const navigate = useNavigate();
    const { 
        graphs, 
        graphNodes, 
        graphEdges, 
        highlights, 
        activeProjectId, 
        activeGraphId,
        addNode, 
        updateNode, 
        removeNode, 
        addEdge, 
        removeEdge 
    } = useStore(useShallow((state: AppStore) => ({
        graphs: state.graphs,
        graphNodes: state.graphNodes,
        graphEdges: state.graphEdges,
        highlights: state.highlights,
        activeProjectId: state.activeProjectId,
        activeGraphId: state.activeGraphId,
        addNode: state.addNode,
        updateNode: state.updateNode,
        removeNode: state.removeNode,
        addEdge: state.addEdge,
        removeEdge: state.removeEdge
    })));

    const activeGraph = graphs.find((g: Graph) => g.id === activeGraphId && !g.deleted);
    const nodes: GraphNode[] = graphNodes.filter((n: GraphNode) => n.graphId === activeGraphId);
    const edges: GraphEdge[] = graphEdges.filter((e: GraphEdge) => e.graphId === activeGraphId);

    // Auto-select first graph if none active
    useEffect(() => {
        if (!activeProjectId) return;
        const projectGraphs = graphs.filter((g: Graph) => g.projectId === activeProjectId && !g.deleted);
        if (!activeGraphId && projectGraphs.length > 0) {
            useStore.setState({ activeGraphId: projectGraphs[0].id });
        }
    }, [activeGraphId, activeProjectId, graphs]);

    const [draggingNode, setDraggingNode] = useState<string | null>(null);
    const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 }); // Offset from node center to mouse click
    const [scale, setScale] = useState(1);
    
    // Panning State
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // Screen coords for panning delta

    // Restore saved view (pan/zoom) when switching graphs
    useEffect(() => {
        if (!activeGraphId) return;
        try {
            const raw = localStorage.getItem(`${GRAPH_VIEW_KEY_PREFIX}${activeGraphId}`);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (
                typeof parsed.scale === "number" &&
                typeof parsed.panX === "number" &&
                typeof parsed.panY === "number"
            ) {
                setScale(parsed.scale);
                setPan({ x: parsed.panX, y: parsed.panY });
            }
        } catch {
        }
    }, [activeGraphId]);

    // Persist view when pan/zoom changes
    useEffect(() => {
        if (!activeGraphId) return;
        try {
            const payload = {
                scale,
                panX: pan.x,
                panY: pan.y,
            };
            localStorage.setItem(`${GRAPH_VIEW_KEY_PREFIX}${activeGraphId}`, JSON.stringify(payload));
        } catch {
        }
    }, [activeGraphId, pan, scale]);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ type: 'node' | 'edge', id: string } | null>(null);
    
    // Preview Node State
    const [previewNodeId, setPreviewNodeId] = useState<string | null>(null);

    // Node Dialog State
    const [nodeDialog, setNodeDialog] = useState<{
        open: boolean;
        mode: 'create' | 'edit';
        type: 'note' | 'file' | 'collection' | 'highlight' | 'link' | 'doc';
        node?: GraphNode;
    }>({ open: false, mode: 'create', type: 'note' });
    
    // Helper to sync addNodeDialog with nodeDialog for compatibility
    const setAddNodeDialog = (state: any) => {
        setNodeDialog({
            open: state.open,
            mode: 'create',
            type: state.type || 'note'
        });
    };
    const addNodeDialog = {
        open: nodeDialog.open && nodeDialog.mode === 'create',
        type: nodeDialog.type
    };

    // Load icons
    useEffect(() => {
        const loadIcons = async () => {
            const loaded: Record<string, HTMLImageElement> = {};
            for (const [name, Icon] of Object.entries(iconMap)) {
                try {
                    const svgString = renderToStaticMarkup(<Icon weight="regular" color="#ffffff" />);
                    const img = new Image();
                    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
                    loaded[name] = img;
                } catch (e) {
                    console.warn(`Failed to load icon ${name}`, e);
                }
            }
            imagesRef.current = loaded;
            // Force redraw
            const canvas = document.querySelector('canvas'); 
            // We can't easily access draw() here because it's defined later or we need to put this effect after draw definition?
            // Actually draw is defined below. 
            // We can use a state to force re-render or move the effect.
            setIconsLoaded(true);
        };
        loadIcons();
    }, []);

    const [iconsLoaded, setIconsLoaded] = useState(false);

    // --- Drawing ---
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        
        // Clear screen
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Apply Transform
        ctx.setTransform(dpr, 0, 0, dpr, pan.x * dpr, pan.y * dpr);
        ctx.scale(scale, scale);

        // Draw Dot Grid (Legacy Look)
        const viewWidth = canvas.width / dpr / scale;
        const viewHeight = canvas.height / dpr / scale;
        
        // Calculate visible world bounds
        const startX = -pan.x / scale;
        const startY = -pan.y / scale;
        const endX = startX + viewWidth;
        const endY = startY + viewHeight;

        // Grid parameters
        const gridSize = 40;
        const dotRadius = 1.5 / scale;
        
        // Align grid to world coordinates
        const gridStartX = Math.floor(startX / gridSize) * gridSize;
        const gridStartY = Math.floor(startY / gridSize) * gridSize;

        ctx.fillStyle = "rgba(255, 255, 255, 0.1)"; // Faint dots
        
        // Draw slightly larger area to avoid flickering edges
        for (let x = gridStartX - gridSize; x < endX + gridSize; x += gridSize) {
            for (let y = gridStartY - gridSize; y < endY + gridSize; y += gridSize) {
                ctx.beginPath();
                ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw edges
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2 / scale;
        edges.forEach((edge: GraphEdge) => {
            const from = nodes.find((n: GraphNode) => n.id === edge.fromId);
            const to = nodes.find((n: GraphNode) => n.id === edge.toId);
            if (from && to) {
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(to.x, to.y);
                ctx.stroke();
            }
        });

        // Draw connection line
        if (connectingNodeId) {
            const from = nodes.find((n: GraphNode) => n.id === connectingNodeId);
            if (from) {
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(mousePos.x, mousePos.y);
                ctx.strokeStyle = '#3b82f6'; // Blue
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        nodes.forEach((node: GraphNode) => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = node.color || COLORS[0];
            ctx.fill();
            
            // Highlight if connecting
            if (connectingNodeId === node.id) {
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 4 / scale;
            } else {
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 2 / scale;
            }
            ctx.stroke();

            if (node.icon && node.icon !== 'Folder' && imagesRef.current[node.icon]) {
                const img = imagesRef.current[node.icon];
                const iconSize = (NODE_RADIUS * 1.2); 
                ctx.drawImage(img, node.x - iconSize/2, node.y - iconSize/2, iconSize, iconSize);
            } else {
            }

            ctx.fillStyle = '#f5f5f5';
            ctx.font = `${13 / scale}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(node.title.slice(0, 14), node.x, node.y + NODE_RADIUS + (16 / scale));
        });
    }, [nodes, edges, scale, pan, connectingNodeId, mousePos]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = container.clientWidth * dpr;
            canvas.height = container.clientHeight * dpr;
            canvas.style.width = `${container.clientWidth}px`;
            canvas.style.height = `${container.clientHeight}px`;
            draw();
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [draw]);

    useEffect(() => { draw(); }, [draw, iconsLoaded]);

    // --- Mouse Handlers ---
    const getNodeAt = (x: number, y: number): GraphNode | undefined => {
        // x, y are world coords
        return nodes.find((n: GraphNode) => Math.hypot(n.x - x, n.y - y) <= NODE_RADIUS);
    };

    const distToSegment = (p_x: number, p_y: number, v_x: number, v_y: number, w_x: number, w_y: number) => {
      const l2 = (v_x - w_x) * (v_x - w_x) + (v_y - w_y) * (v_y - w_y);
      if (l2 == 0) return Math.hypot(p_x - v_x, p_y - v_y);
      let t = ((p_x - v_x) * (w_x - v_x) + (p_y - v_y) * (w_y - v_y)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(p_x - (v_x + t * (w_x - v_x)), p_y - (v_y + t * (w_y - v_y)));
    };

    const getEdgeAt = (x: number, y: number) => {
        const threshold = 10 / scale; // Hit area depends on scale
        return edges.find((edge: GraphEdge) => {
            const from = nodes.find((n: GraphNode) => n.id === edge.fromId);
            const to = nodes.find((n: GraphNode) => n.id === edge.toId);
            if (!from || !to) return false;
            
            const d = distToSegment(x, y, from.x, from.y, to.x, to.y);
            return d <= threshold;
        });
    };

    const handleNodeOpen = (node: GraphNode) => {
        if (node.type === 'file' && node.linkedId) {
            navigate(`/file/${node.linkedId}`);
            return;
        }

        if (node.type === 'collection' && node.linkedId) {
            useStore.setState({ activeCollectionId: node.linkedId });
            navigate("/collections");
            return;
        }

        if (node.type === 'doc' && node.linkedId) {
            useStore.setState({ activeDocId: node.linkedId });
            navigate("/docs");
            return;
        }

        if (node.type === 'highlight' && node.linkedId) {
            const ts = highlights.find((t: Highlight) => t.id === node.linkedId);
            if (ts) {
                navigate(`/file/${ts.fileId}?t=${ts.start}`);
            } else {
                navigate(`/file/${node.linkedId}`);
            }
            return;
        }

        if (node.type === 'link' && node.url) {
            const url = node.url;
            window.open(url, "_blank", "noopener,noreferrer");
        }
    };

    const handleDoubleClick = (e: MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldX = (screenX - pan.x) / scale;
        const worldY = (screenY - pan.y) / scale;

        const node = getNodeAt(worldX, worldY);
        if (!node) return;

        // Open preview card instead of full edit dialog
        setPreviewNodeId(node.id);
    };

    const handleMouseDown = (e: MouseEvent) => {
        // Close preview if clicking elsewhere (will be handled by overlay click if not on card, 
        // but if we click canvas, we should close it)
        if (previewNodeId) {
             // Check if we clicked on the preview card? 
             // The preview card stops propagation, so if we are here, we clicked the canvas.
             setPreviewNodeId(null);
        }

        if (connectingNodeId) {
            return;
        }
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        // Convert click to Screen Space (relative to canvas) for Pan Delta
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Convert to World Space for Node Detection
        const worldX = (screenX - pan.x) / scale;
        const worldY = (screenY - pan.y) / scale;

        const node = getNodeAt(worldX, worldY);
        
        if (node) {
            if (e.shiftKey) {
                setConnectingNodeId(node.id);
                setMousePos({ x: worldX, y: worldY });
                return;
            }
            setDraggingNode(node.id);
            setOffset({ x: worldX - node.x, y: worldY - node.y });
        } else {
            setIsPanning(true);
            setDragStart({ x: e.clientX, y: e.clientY }); // Global client coords for delta
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        const worldX = (screenX - pan.x) / scale;
        const worldY = (screenY - pan.y) / scale;
        
        // Update mouse pos for connection drawing
        if (connectingNodeId) {
            setMousePos({ x: worldX, y: worldY });
            return;
        }

        if (draggingNode) {
            useStore.setState((state: AppStore) => ({
                graphNodes: state.graphNodes.map((n: GraphNode) =>
                    n.id === draggingNode ? { ...n, x: worldX - offset.x, y: worldY - offset.y } : n
                )
            }));
        } else if (isPanning) {
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            
            // Update Pan
            setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setDragStart({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (connectingNodeId) {
             const rect = canvasRef.current?.getBoundingClientRect();
             if (rect) {
                const screenX = e.clientX - rect.left;
                const screenY = e.clientY - rect.top;
                const worldX = (screenX - pan.x) / scale;
                const worldY = (screenY - pan.y) / scale;
                const targetNode = getNodeAt(worldX, worldY);
                
                if (targetNode && targetNode.id !== connectingNodeId) {
                    // Create edge
                    useStore.setState((state: AppStore) => {
                        // Check if edge exists
                        const exists = state.graphEdges.some((edge: GraphEdge) => 
                            (edge.fromId === connectingNodeId && edge.toId === targetNode.id) ||
                            (edge.fromId === targetNode.id && edge.toId === connectingNodeId)
                        );
                        
                        if (!exists && activeGraphId) {
                            return {
                                graphEdges: [...state.graphEdges, {
                                    id: crypto.randomUUID(),
                                    graphId: activeGraphId,
                                    fromId: connectingNodeId,
                                    toId: targetNode.id,
                                    created: Date.now()
                                }]
                            };
                        }
                        return state;
                    });
                }
             }
             setConnectingNodeId(null);
        }

        setDraggingNode(null);
        setIsPanning(false);
    };

    const handleWheel = (e: WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        const worldX = (screenX - pan.x) / scale;
        const worldY = (screenY - pan.y) / scale;

        const zoomFactor = 1.1;
        const direction = e.deltaY < 0 ? 1 : -1;
        const nextScale = direction > 0 ? scale * zoomFactor : scale / zoomFactor;
        const clampedScale = Math.min(3, Math.max(0.2, nextScale));
        if (clampedScale === scale) return;

        const newPanX = screenX - worldX * clampedScale;
        const newPanY = screenY - worldY * clampedScale;

        setScale(clampedScale);
        setPan({ x: newPanX, y: newPanY });
    };

    const handleFitToView = () => {
        if (!activeGraphId) return;
        const container = containerRef.current;
        if (!container) return;
        if (nodes.length === 0) {
            setScale(1);
            setPan({ x: 0, y: 0 });
            return;
        }

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        nodes.forEach(node => {
            if (node.x < minX) minX = node.x;
            if (node.x > maxX) maxX = node.x;
            if (node.y < minY) minY = node.y;
            if (node.y > maxY) maxY = node.y;
        });

        const boundsWidth = maxX - minX + NODE_RADIUS * 2;
        const boundsHeight = maxY - minY + NODE_RADIUS * 2;
        if (boundsWidth <= 0 || boundsHeight <= 0) return;

        const padding = 80;
        const viewWidth = container.clientWidth;
        const viewHeight = container.clientHeight;
        if (viewWidth <= padding * 2 || viewHeight <= padding * 2) return;

        const scaleX = (viewWidth - padding * 2) / boundsWidth;
        const scaleY = (viewHeight - padding * 2) / boundsHeight;
        let nextScale = Math.min(scaleX, scaleY);
        nextScale = Math.min(3, Math.max(0.2, nextScale));

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const screenCenterX = viewWidth / 2;
        const screenCenterY = viewHeight / 2;

        const nextPanX = screenCenterX - centerX * nextScale;
        const nextPanY = screenCenterY - centerY * nextScale;

        setScale(nextScale);
        setPan({ x: nextPanX, y: nextPanY });
    };

    // --- Actions ---
    const handleCreateNode = (nodeData: Partial<GraphNode>) => {
        if (!activeGraphId) return;
        
        const rect = containerRef.current?.getBoundingClientRect();
        const centerX = rect ? (rect.width / 2 - pan.x) / scale : 100;
        const centerY = rect ? (rect.height / 2 - pan.y) / scale : 100;

        const newNode: GraphNode = {
            id: crypto.randomUUID(),
            graphId: activeGraphId,
            x: centerX + (Math.random() * 40 - 20),
            y: centerY + (Math.random() * 40 - 20),
            title: nodeData.title || (addNodeDialog.type === 'note' ? 'New Note' : addNodeDialog.type.charAt(0).toUpperCase() + addNodeDialog.type.slice(1)),
            type: addNodeDialog.type,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            created: Date.now(),
            ...nodeData
        };

        addNode(newNode);
        setAddNodeDialog({ ...addNodeDialog, open: false });
    };

    const handleAddNode = (type: 'note' | 'file' | 'collection' | 'highlight' | 'link' | 'doc' = 'note') => {
        setAddNodeDialog({ open: true, type });
    };

    // --- Keybinds ---
    useKeybind("n", () => {
        if (!nodeDialog.open) {
            handleAddNode('note');
        }
    }, { preventDefault: true, disableInInput: true });

    useKeybind("space", () => {
        if (!nodeDialog.open) {
            handleFitToView();
        }
    }, { preventDefault: true, disableInInput: true });

    useKeybind("=", () => setScale(s => Math.min(3, s * 1.2)), { preventDefault: true });
    useKeybind("+", () => setScale(s => Math.min(3, s * 1.2)), { preventDefault: true });
    useKeybind("-", () => setScale(s => Math.max(0.2, s / 1.2)), { preventDefault: true });

    // Panning
    const PAN_STEP = 40;
    const FAST_PAN_STEP = 200;

    useKeybind("arrowup", () => setPan(p => ({ ...p, y: p.y + 40 })), { preventDefault: true });
    useKeybind("arrowdown", () => setPan(p => ({ ...p, y: p.y - 40 })), { preventDefault: true });
    useKeybind("arrowleft", () => setPan(p => ({ ...p, x: p.x + 40 })), { preventDefault: true });
    useKeybind("arrowright", () => setPan(p => ({ ...p, x: p.x - 40 })), { preventDefault: true });
    
    useKeybind("shift+arrowup", () => setPan(p => ({ ...p, y: p.y + 200 })), { preventDefault: true });
    useKeybind("shift+arrowdown", () => setPan(p => ({ ...p, y: p.y - 200 })), { preventDefault: true });
    useKeybind("shift+arrowleft", () => setPan(p => ({ ...p, x: p.x + 200 })), { preventDefault: true });
    useKeybind("shift+arrowright", () => setPan(p => ({ ...p, x: p.x - 200 })), { preventDefault: true });

    useKeybind("delete", () => {
        if (previewNodeId) {
            useStore.setState((state: AppStore) => ({
                graphNodes: state.graphNodes.filter(n => n.id !== previewNodeId),
                graphEdges: state.graphEdges.filter(e => e.fromId !== previewNodeId && e.toId !== previewNodeId)
            }));
            setPreviewNodeId(null);
        }
    }, { preventDefault: true });

    useKeybind("backspace", () => {
        if (previewNodeId) {
            useStore.setState((state: AppStore) => ({
                graphNodes: state.graphNodes.filter(n => n.id !== previewNodeId),
                graphEdges: state.graphEdges.filter(e => e.fromId !== previewNodeId && e.toId !== previewNodeId)
            }));
            setPreviewNodeId(null);
        }
    }, { preventDefault: true });

    const handleContextMenu = (e: MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldX = (screenX - pan.x) / scale;
        const worldY = (screenY - pan.y) / scale;
        
        const node = getNodeAt(worldX, worldY);

        if (node) {
            setContextMenu({ type: 'node', id: node.id });
            return;
        }
        const edge = getEdgeAt(worldX, worldY);
        if (edge) {
            setContextMenu({ type: 'edge', id: edge.id });
            return;
        }
        setContextMenu(null);
    };

    const handleAction = (action: 'edit' | 'delete' | 'connect') => {
        if (!contextMenu) return;
        const { type, id } = contextMenu;
        setContextMenu(null);

        if (action === 'connect' && type === 'node') {
            const node = graphNodes.find((n: GraphNode) => n.id === id);
            if (node) {
                setConnectingNodeId(id);
                setMousePos({ x: node.x, y: node.y });
            }
            return;
        }

        if (action === 'delete') {
            if (type === 'node') {
            useStore.setState((state: AppStore) => ({
                    graphNodes: state.graphNodes.filter(n => n.id !== id),
                    graphEdges: state.graphEdges.filter(e => e.fromId !== id && e.toId !== id)
                }));
            } else if (type === 'edge') {
            useStore.setState((state: AppStore) => ({
                    graphEdges: state.graphEdges.filter(e => e.id !== id)
                }));
            }
        } else if (action === 'edit') {
            if (type === 'node') {
                const node = graphNodes.find((n: GraphNode) => n.id === id);
                if (node) {
                    setNodeDialog({
                        open: true,
                        mode: 'edit',
                        type: node.type,
                        node
                    });
                }
            }
        }
    };

    const handleSaveNode = (nodeData: Partial<GraphNode>) => {
        if (nodeDialog.mode === 'create') {
            handleCreateNode(nodeData);
        } else if (nodeDialog.mode === 'edit' && nodeDialog.node) {
            updateNode(nodeDialog.node.id, nodeData);
            setNodeDialog({ ...nodeDialog, open: false });
        }
    };

    const handleCreateGraph = () => {
        if (!activeProjectId) return;

        const newGraph = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            name: "New Graph",
            created: Date.now(),
            lastModified: Date.now()
        };

        useStore.setState((state: AppStore) => ({
            graphs: [...state.graphs, newGraph],
            activeGraphId: newGraph.id
        }));

        navigate("/graphs");
    };

    return (
        <div className="flex h-full bg-transparent overflow-hidden">
            <div ref={containerRef} className="flex-1 relative bg-transparent flex flex-col">
                {activeGraph ? (
                    <>
                        {/* Toolbar */}
                        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm p-1.5 rounded-lg border border-white/10 shadow-lg">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-white hover:bg-white/10">
                                        <Plus className="mr-2" /> Add Node
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48 bg-neutral-900 border-white/10 text-white">
                                    <DropdownMenuItem onClick={() => handleAddNode('note')} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                        <Note className="mr-2" /> Note
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAddNode('file')} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                        <File className="mr-2" /> File
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAddNode('collection')} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                        <Folder className="mr-2" /> Collection
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAddNode('highlight')} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                        <Clock className="mr-2" /> Highlight
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAddNode('doc')} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                        <NotePencil className="mr-2" /> Doc
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAddNode('link')} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                        <LinkIcon className="mr-2" /> Link
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="w-px h-4 bg-white/10 mx-1" />

                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10" onClick={() => setScale(s => Math.min(s + 0.1, 3))}>
                                <MagnifyingGlassPlus />
                            </Button>
                            <span className="text-xs text-muted-foreground w-8 text-center select-none">{Math.round(scale * 100)}%</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10" onClick={() => setScale(s => Math.max(s - 0.1, 0.2))}>
                                <MagnifyingGlassMinus />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10"
                                onClick={handleFitToView}
                                title="Fit to view"
                            >
                                <ArrowsOutSimple />
                            </Button>
                        </div>

                        <ContextMenu
                            onOpenChange={(open: boolean) => {
                                if (!open) {
                                    setContextMenu(null);
                                }
                            }}
                        >
                            <ContextMenuTrigger asChild>
                                <canvas
                                    ref={canvasRef}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                    onContextMenu={handleContextMenu}
                                    onDoubleClick={handleDoubleClick}
                                    onWheel={handleWheel}
                                    className={cn(
                                        "block w-full h-full",
                                        isPanning ? "cursor-grabbing" : draggingNode ? "cursor-grabbing" : "cursor-grab"
                                    )}
                                />
                            </ContextMenuTrigger>

                            {contextMenu && (
                                <ContextMenuContent className="w-48">
                                    {contextMenu.type === 'node' && (
                                        <>
                                            <ContextMenuItem onClick={() => handleAction('edit')} inset className="gap-2">
                                                <PencilSimple /> Edit node
                                            </ContextMenuItem>
                                            <ContextMenuItem onClick={() => handleAction('connect')} inset className="gap-2">
                                                <LinkIcon /> Connect to...
                                            </ContextMenuItem>
                                            <ContextMenuSeparator />
                                        </>
                                    )}
                                    <ContextMenuItem
                                        onClick={() => handleAction('delete')}
                                        variant="destructive"
                                        inset
                                        className="gap-2"
                                    >
                                        <Trash /> Delete
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            )}
                        </ContextMenu>

                        {/* Node Count / Info */}
                        <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-xs text-white/50 px-2 py-1 rounded select-none pointer-events-none border border-white/5">
                            {nodes.length} nodes • {edges.length} edges
                        </div>

                        {/* Node Preview Card */}
                        {previewNodeId && (() => {
                            const node = nodes.find(n => n.id === previewNodeId);
                            if (node) {
                                const screenX = node.x * scale + pan.x;
                                const screenY = node.y * scale + pan.y;
                                return (
                                    <NodePreviewCard
                                        node={node}
                                        onClose={() => setPreviewNodeId(null)}
                                        onEdit={() => {
                                            setPreviewNodeId(null);
                                            setNodeDialog({
                                                open: true,
                                                mode: 'edit',
                                                type: node.type,
                                                node
                                            });
                                        }}
                                        style={{
                                            left: screenX,
                                            top: screenY - NODE_RADIUS - 10,
                                            transform: 'translate(-50%, -100%)'
                                        }}
                                    />
                                );
                            }
                            return null;
                        })()}

                        <NodeDialog 
                            open={nodeDialog.open} 
                            onOpenChange={(open: boolean) => setNodeDialog(prev => ({ ...prev, open }))}
                            mode={nodeDialog.mode}
                            type={nodeDialog.type}
                            node={nodeDialog.node}
                            onSave={handleSaveNode}
                        />
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <Circle size={64} weight="thin" className="mx-auto mb-4 opacity-30" />
                            <p className="mb-4">Select or create a graph</p>
                            <Button variant="default" size="sm" onClick={handleCreateGraph}>
                                <Plus className="mr-2" /> Create Graph
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
