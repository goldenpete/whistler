import { useRef, useState, useEffect, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Plus, Circle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { GraphNode } from "@/types";

const NODE_RADIUS = 24;
const COLORS = ["#f97316", "#8b5cf6", "#10b981", "#3b82f6", "#ef4444", "#eab308"];

export default function GraphView() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { graphs, graphNodes, graphEdges, activeProjectId, activeGraphId } = useStore();

    const projectGraphs = graphs.filter(g => g.projectId === activeProjectId && !g.deleted);
    const activeGraph = graphs.find(g => g.id === activeGraphId);
    const nodes = graphNodes.filter(n => n.graphId === activeGraphId);
    const edges = graphEdges.filter(e => e.graphId === activeGraphId);

    const [draggingNode, setDraggingNode] = useState<string | null>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    // --- Drawing ---
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw edges
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;
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

        // Draw nodes
        nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = node.color || COLORS[0];
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Label
            ctx.fillStyle = '#fff';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(node.title.slice(0, 12), node.x, node.y + NODE_RADIUS + 14);
        });
    }, [nodes, edges]);

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

    useEffect(() => { draw(); }, [draw]);

    // --- Mouse Handlers ---
    const getNodeAt = (x: number, y: number): GraphNode | undefined => {
        return nodes.find(n => Math.hypot(n.x - x, n.y - y) <= NODE_RADIUS);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const node = getNodeAt(x, y);
        if (node) {
            setDraggingNode(node.id);
            setOffset({ x: x - node.x, y: y - node.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingNode) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left - offset.x;
        const y = e.clientY - rect.top - offset.y;

        useStore.setState(state => ({
            graphNodes: state.graphNodes.map(n =>
                n.id === draggingNode ? { ...n, x, y } : n
            )
        }));
    };

    const handleMouseUp = () => {
        setDraggingNode(null);
    };

    // --- Actions ---
    const handleCreateGraph = () => {
        const name = prompt("Graph name:");
        if (name && activeProjectId) {
            const newGraph = {
                id: crypto.randomUUID(),
                projectId: activeProjectId,
                name,
                created: Date.now()
            };
            useStore.setState(state => ({
                graphs: [...state.graphs, newGraph],
                activeGraphId: newGraph.id
            }));
        }
    };

    const handleSelectGraph = (id: string) => {
        useStore.setState({ activeGraphId: id });
    };

    const handleAddNode = () => {
        if (!activeGraphId) return;
        const newNode: GraphNode = {
            id: crypto.randomUUID(),
            graphId: activeGraphId,
            type: 'note',
            title: 'New Node',
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200,
            linkedId: null,
            url: null,
            created: Date.now()
        };
        useStore.setState(state => ({ graphNodes: [...state.graphNodes, newNode] }));
    };

    return (
        <div className="flex h-full bg-background">
            {/* Sidebar: Graph List */}
            <div className="w-56 border-r border-border flex flex-col shrink-0 bg-card/50">
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Graphs</h2>
                    <Button variant="ghost" size="icon" onClick={handleCreateGraph} className="size-7">
                        <Plus weight="bold" />
                    </Button>
                </div>
                <div className="flex-1 p-2 space-y-1 overflow-auto">
                    {projectGraphs.map(g => (
                        <button
                            key={g.id}
                            onClick={() => handleSelectGraph(g.id)}
                            className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
                                activeGraphId === g.id
                                    ? "bg-accent text-accent-foreground"
                                    : "hover:bg-secondary/50 text-muted-foreground"
                            )}
                        >
                            <Circle weight="fill" className="text-lg shrink-0 text-amber-500" />
                            <span className="truncate">{g.name}</span>
                        </button>
                    ))}
                    {projectGraphs.length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground italic">No graphs yet.</div>
                    )}
                </div>
            </div>

            {/* Canvas Area */}
            <div ref={containerRef} className="flex-1 relative bg-neutral-950">
                {activeGraph ? (
                    <>
                        <canvas
                            ref={canvasRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            className="block cursor-crosshair"
                        />
                        <div className="absolute bottom-4 right-4 flex gap-2">
                            <Button variant="secondary" size="sm" onClick={handleAddNode}>
                                <Plus className="mr-1" /> Add Node
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                            <Circle size={64} weight="thin" className="mx-auto mb-4 opacity-30" />
                            <p>Select or create a graph to get started</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
