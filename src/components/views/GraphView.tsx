import { useRef, useState, useEffect, useCallback } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import {
    Plus, Circle,
    Note, File, Folder, Clock, Link as LinkIcon,
    MagnifyingGlassPlus, MagnifyingGlassMinus, PencilSimple
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { GraphNode } from "@/types";
import { NodeDialog } from "@/components/dialogs/EditNodeDialog";
import { iconMap } from "@/utils/iconMap";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

const NODE_RADIUS = 24;
const COLORS = ["#f97316", "#8b5cf6", "#10b981", "#3b82f6", "#ef4444", "#eab308"];

export default function GraphView() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imagesRef = useRef<Record<string, HTMLImageElement>>({});
    const navigate = useNavigate();
    const { 
        graphs, graphNodes, graphEdges, activeProjectId, activeGraphId,
        addNode, updateNode, removeNode, addEdge, removeEdge
    } = useStore();

    const activeGraph = graphs.find(g => g.id === activeGraphId);
    const nodes = graphNodes.filter(n => n.graphId === activeGraphId);
    const edges = graphEdges.filter(e => e.graphId === activeGraphId);

    const [draggingNode, setDraggingNode] = useState<string | null>(null);
    const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 }); // Offset from node center to mouse click
    const [scale, setScale] = useState(1);
    
    // Panning State
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // Screen coords for panning delta

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'node' | 'edge', id: string } | null>(null);
    
    // Node Dialog State
    const [nodeDialog, setNodeDialog] = useState<{
        open: boolean;
        mode: 'create' | 'edit';
        type: 'note' | 'file' | 'collection' | 'timestamp' | 'link';
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
        edges.forEach(edge => {
            const from = nodes.find(n => n.id === edge.fromId);
            const to = nodes.find(n => n.id === edge.toId);
            if (from && to) {
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(to.x, to.y);
                ctx.stroke();
            }
        });

        // Draw connection line
        if (connectingNodeId) {
            const from = nodes.find(n => n.id === connectingNodeId);
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

        // Draw nodes
        nodes.forEach(node => {
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

            // Icon/Label
            // Draw icon if available
            if (node.icon && node.icon !== 'Folder' && imagesRef.current[node.icon]) {
                const img = imagesRef.current[node.icon];
                // Icon size relative to node radius
                const iconSize = (NODE_RADIUS * 1.2); 
                ctx.drawImage(img, node.x - iconSize/2, node.y - iconSize/2, iconSize, iconSize);
            } else {
                 // No icon? Maybe draw title inside? Or just nothing.
                 // For now, nothing inside.
            }

            // Title below
            ctx.fillStyle = '#fff';
            ctx.font = `${10 / scale}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(node.title.slice(0, 12), node.x, node.y + NODE_RADIUS + (14 / scale));
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
        return nodes.find(n => Math.hypot(n.x - x, n.y - y) <= NODE_RADIUS);
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
        return edges.find(edge => {
            const from = nodes.find(n => n.id === edge.fromId);
            const to = nodes.find(n => n.id === edge.toId);
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

        if (node.type === 'timestamp' && node.linkedId) {
            navigate(`/file/${node.linkedId}`);
            return;
        }

        if (node.type === 'link' && node.url) {
            const url = node.url;
            window.open(url, "_blank", "noopener,noreferrer");
        }
    };

    const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldX = (screenX - pan.x) / scale;
        const worldY = (screenY - pan.y) / scale;

        const node = getNodeAt(worldX, worldY);
        if (!node) return;

        handleNodeOpen(node);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
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
            // Check for Shift key to start connection
            if (e.shiftKey) {
                setConnectingNodeId(node.id);
                setMousePos({ x: worldX, y: worldY });
            } else {
                setDraggingNode(node.id);
                setOffset({ x: worldX - node.x, y: worldY - node.y });
            }
        } else {
            setIsPanning(true);
            setDragStart({ x: e.clientX, y: e.clientY }); // Global client coords for delta
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
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
            useStore.setState(state => ({
                graphNodes: state.graphNodes.map(n =>
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

    const handleMouseUp = (e: React.MouseEvent) => {
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
                    useStore.setState(state => {
                        // Check if edge exists
                        const exists = state.graphEdges.some(edge => 
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

    const handleAddNode = (type: 'note' | 'file' | 'collection' | 'timestamp' | 'link' = 'note') => {
        setAddNodeDialog({ open: true, type });
    };


    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldX = (screenX - pan.x) / scale;
        const worldY = (screenY - pan.y) / scale;
        
        const node = getNodeAt(worldX, worldY);

        if (node) {
            setContextMenu({ x: e.clientX, y: e.clientY, type: 'node', id: node.id });
        } else {
            const edge = getEdgeAt(worldX, worldY);
            if (edge) {
                setContextMenu({ x: e.clientX, y: e.clientY, type: 'edge', id: edge.id });
            } else {
                setContextMenu(null);
            }
        }
    };

    const handleAction = (action: 'edit' | 'delete') => {
        if (!contextMenu) return;
        const { type, id } = contextMenu;
        setContextMenu(null); // Close menu

        if (action === 'delete') {
            if (type === 'node') {
                useStore.setState(state => ({
                    graphNodes: state.graphNodes.filter(n => n.id !== id),
                    graphEdges: state.graphEdges.filter(e => e.fromId !== id && e.toId !== id)
                }));
            } else if (type === 'edge') {
                useStore.setState(state => ({
                    graphEdges: state.graphEdges.filter(e => e.id !== id)
                }));
            }
        } else if (action === 'edit') {
            if (type === 'node') {
                const node = graphNodes.find(n => n.id === id);
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

        useStore.setState(state => ({
            graphs: [...state.graphs, newGraph],
            activeGraphId: newGraph.id
        }));

        navigate("/graphs");
    };

    return (
        <div className="flex h-full bg-background overflow-hidden">
            <div ref={containerRef} className="flex-1 relative bg-neutral-950 flex flex-col">
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
                                    <DropdownMenuItem onClick={() => handleAddNode('timestamp')} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                        <Clock className="mr-2" /> Timestamp
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
                        </div>

                        <canvas
                            ref={canvasRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onContextMenu={handleContextMenu}
                            onClick={() => setContextMenu(null)}
                            onDoubleClick={handleDoubleClick}
                            className={cn(
                                "block w-full h-full",
                                isPanning ? "cursor-grabbing" : draggingNode ? "cursor-grabbing" : "cursor-grab"
                            )}
                        />

                        {/* Node Count / Info */}
                        <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-xs text-white/50 px-2 py-1 rounded select-none pointer-events-none border border-white/5">
                            {nodes.length} nodes • {edges.length} edges
                        </div>

                        {/* Context Menu */}
                        {contextMenu && (
                            <div
                                className="absolute bg-zinc-900 border border-zinc-800 rounded-md shadow-xl py-1 z-50 min-w-[120px]"
                                style={{ top: contextMenu.y - (containerRef.current?.getBoundingClientRect().top || 0), left: contextMenu.x - (containerRef.current?.getBoundingClientRect().left || 0) }}
                            >
                                {contextMenu.type === 'node' && (
                                    <>
                                        <button onClick={() => handleAction('edit')} className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 text-white transition-colors flex items-center gap-2">
                                            <PencilSimple /> Edit Node
                                        </button>
                                        <div className="h-px bg-white/10 my-1" />
                                    </>
                                )}
                                <button onClick={() => handleAction('delete')} className="w-full text-left px-4 py-2 text-sm hover:bg-red-500/20 text-red-400 transition-colors">Delete</button>
                            </div>
                        )}

                        <NodeDialog 
                            open={nodeDialog.open} 
                            onOpenChange={(open) => setNodeDialog(prev => ({ ...prev, open }))}
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
