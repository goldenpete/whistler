/**
 * ─── GraphView.tsx ─────────────────────────────────────────────────
 *
 * Interactive canvas-based node graph visualization for mapping
 * relationships between files, notes, and concepts in a project.
 *
 * Features:
 *   - HTML5 Canvas rendering with pan and zoom controls
 *   - Node creation, editing, and deletion via dialogs
 *   - Edge drawing between nodes with drag interactions
 *   - Color-coded nodes with icon support (iconMap)
 *   - Context menus for node/edge actions
 *   - Node preview cards with linked content
 *   - Keyboard shortcuts for graph manipulation
 *
 * Exports: default GraphView component
 * Related: EditNodeDialog, NodePreviewCard, iconMap, useStore
 * ───────────────────────────────────────────────────────────────────
 */
import React, { useRef, useState, useEffect, useCallback, useMemo, type MouseEvent, type WheelEvent, type KeyboardEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useShallow } from "@/lib/zustand-shallow";
import { useStore, type AppStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { useKeybind } from "@/hooks/use-keybind";
import {
    Plus, Circle, Square,
    Note, File, Folder, Clock, Link as LinkIcon,
    NotePencil, Palette, Stamp,
    MagnifyingGlassPlus, MagnifyingGlassMinus, PencilSimple, Trash, ArrowsOutSimple
} from "@phosphor-icons/react";
import { cn, clamp } from "@/lib/utils";
import type { GraphNode, GraphEdge, Graph, Highlight } from "@/types";
import { NodeDialog } from "@/components/dialogs/EditNodeDialog";
import { NodePreviewCard } from "@/components/graph/NodePreviewCard";
import { iconMap, iconNames } from "@/utils/iconMap";
import { PRESET_COLORS } from "@/components/ui/ColorPicker";
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
import { useNavigate, useParams } from "react-router-dom";

// ── Node shape constants ──
// "Circle" mode is actually a compact square; "square" mode is a wider badge/rectangle
const NODE_SIZE = 36;          // Compact square side length (was circle of radius 18)
const BADGE_MIN_W = 80;        // Badge minimum width
const BADGE_MAX_W = 200;       // Badge maximum width
const BADGE_H = 30;            // Badge height
const BADGE_PAD_LEFT = 10;     // Left padding in badge
const BADGE_PAD_RIGHT = 10;    // Right padding in badge
const BADGE_ICON_SIZE = 14;    // Icon size inside badge
const BADGE_ICON_GAP = 6;      // Gap between icon and text
const BADGE_FONT = '500 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const COLORS = ["#f97316", "#8b5cf6", "#10b981", "#3b82f6", "#ef4444", "#eab308"];
const GRAPH_VIEW_KEY_PREFIX = "graph_view_";

export default function GraphView() {
    const { id } = useParams();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imagesRef = useRef<Record<string, HTMLImageElement>>({});
    const rafRef = useRef<number>(0);
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

    useEffect(() => {
        if (id && id !== activeGraphId) {
            useStore.setState({ activeGraphId: id });
        }
    }, [id, activeGraphId]);

    const activeGraph = graphs.find((g: Graph) => g.id === activeGraphId && !g.deleted);
    const nodes: GraphNode[] = useMemo(() => graphNodes.filter((n: GraphNode) => n.graphId === activeGraphId), [graphNodes, activeGraphId]);
    const edges: GraphEdge[] = useMemo(() => graphEdges.filter((e: GraphEdge) => e.graphId === activeGraphId), [graphEdges, activeGraphId]);

    // Auto-select first graph if none active
    useEffect(() => {
        if (!activeProjectId) return;
        const projectGraphs = graphs.filter((g: Graph) => g.projectId === activeProjectId && !g.deleted);
        if (!activeGraphId && projectGraphs.length > 0) {
            useStore.setState({ activeGraphId: projectGraphs[0].id });
        }
    }, [activeGraphId, activeProjectId, graphs]);

    const [nodeShape, setNodeShape] = useState<'circle' | 'square'>('circle');
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
            if (parsed.nodeShape === 'circle' || parsed.nodeShape === 'square') {
                setNodeShape(parsed.nodeShape);
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
                nodeShape,
            };
            localStorage.setItem(`${GRAPH_VIEW_KEY_PREFIX}${activeGraphId}`, JSON.stringify(payload));
        } catch {
        }
    }, [activeGraphId, pan, scale, nodeShape]);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ type: 'node' | 'edge', id: string } | null>(null);
    
    // Inline color/icon picker for context menu actions
    const [colorPickerNodeId, setColorPickerNodeId] = useState<string | null>(null);
    const [iconPickerNodeId, setIconPickerNodeId] = useState<string | null>(null);
    
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
    const setAddNodeDialog = (state: { open: boolean; type?: 'note' | 'file' | 'collection' | 'highlight' | 'link' | 'doc' }) => {
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

    // Add Node Menu State
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

    // Load icons
    useEffect(() => {
        let cancelled = false;
        const loadIcons = async () => {
            const loaded: Record<string, HTMLImageElement> = {};
            for (const [name, Icon] of Object.entries(iconMap)) {
                try {
                    const dpr = window.devicePixelRatio || 1;
                    const renderSize = Math.round(48 * dpr); // Render at high res for crisp scaling
                    const svgString = renderToStaticMarkup(<Icon weight="regular" color="#ffffff" size={renderSize} />);
                    const img = new Image(renderSize, renderSize);
                    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
                    loaded[name] = img;
                } catch (e) {
                    console.warn(`Failed to load icon ${name}`, e);
                }
            }
            if (cancelled) return;
            imagesRef.current = loaded;
            setIconsLoaded(true);
        };
        loadIcons();
        return () => { cancelled = true; };
    }, []);

    const [iconsLoaded, setIconsLoaded] = useState(false);

    // Clean up pending rAF on unmount
    useEffect(() => {
        return () => { cancelAnimationFrame(rafRef.current); };
    }, []);

    // --- Drawing ---
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;

        // Helper: draw text snapped to exact device pixels for crispness
        const drawCrispText = (
            text: string,
            worldX: number,
            worldY: number,
            font: string,
            fillStyle: string,
            align: CanvasTextAlign = 'left',
            maxWidth?: number
        ) => {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            // Convert world coords → device pixels, rounded to integer
            const devX = Math.round((worldX * scale + pan.x) * dpr);
            const devY = Math.round((worldY * scale + pan.y) * dpr);
            // Scale font size by scale * dpr for device resolution
            const fontSize = parseFloat(font.match(/([\d.]+)px/)?.[1] || '11');
            const fontWeight = font.match(/(\d+)\s+[\d.]+px/)?.[1] || '400';
            const fontFamily = font.replace(/^.*?px\s*/, '');
            const devFont = `${fontWeight} ${Math.round(fontSize * scale * dpr)}px ${fontFamily}`;
            ctx.font = devFont;
            ctx.fillStyle = fillStyle;
            ctx.textAlign = align;
            if (maxWidth !== undefined) {
                ctx.fillText(text, devX, devY, maxWidth * scale * dpr);
            } else {
                ctx.fillText(text, devX, devY);
            }
            ctx.restore();
            // Restore world transform
            ctx.setTransform(dpr, 0, 0, dpr, pan.x * dpr, pan.y * dpr);
            ctx.scale(scale, scale);
        };

        // Helper: measure text at world-space font (returns world-space width)
        const measureCrispText = (text: string, font: string): number => {
            ctx.save();
            ctx.font = font;
            const w = ctx.measureText(text).width;
            ctx.restore();
            return w;
        };
        
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

        // Batch all dots into a single path for performance
        ctx.beginPath();
        for (let x = gridStartX - gridSize; x < endX + gridSize; x += gridSize) {
            for (let y = gridStartY - gridSize; y < endY + gridSize; y += gridSize) {
                ctx.moveTo(x + dotRadius, y);
                ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            }
        }
        ctx.fill();

        // Build node lookup map for O(1) access during edge drawing
        const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));

        // Draw edges
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2 / scale;
        edges.forEach((edge: GraphEdge) => {
            const from = nodeMap.get(edge.fromId);
            const to = nodeMap.get(edge.toId);
            if (from && to) {
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(to.x, to.y);
                ctx.stroke();
            }
        });

        // Draw connection line
        if (connectingNodeId) {
            const from = nodeMap.get(connectingNodeId);
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
            const color = node.color || COLORS[0];

            if (nodeShape === 'square') {
                // ── Badge / rectangle mode ──
                const hasIcon = !!(node.icon && imagesRef.current[node.icon]);
                const textStart = BADGE_PAD_LEFT + (hasIcon ? BADGE_ICON_SIZE + BADGE_ICON_GAP : 0) + 3; // +3 for accent bar

                // Measure text to compute dynamic badge width
                ctx.font = BADGE_FONT;
                const maxTextW = BADGE_MAX_W - textStart - BADGE_PAD_RIGHT;
                const fullTextW = ctx.measureText(node.title).width;

                // Truncate with ellipsis if needed
                let displayText = node.title;
                if (fullTextW > maxTextW) {
                    const ellipsis = '\u2026';
                    const ellipsisW = ctx.measureText(ellipsis).width;
                    let truncated = node.title;
                    while (truncated.length > 1 && ctx.measureText(truncated).width + ellipsisW > maxTextW) {
                        truncated = truncated.slice(0, -1);
                    }
                    displayText = truncated + ellipsis;
                }

                const textW = ctx.measureText(displayText).width;
                const badgeW = Math.max(BADGE_MIN_W, Math.min(BADGE_MAX_W, textStart + textW + BADGE_PAD_RIGHT));

                const hw = badgeW / 2;
                const hh = BADGE_H / 2;
                const rx = node.x - hw;
                const ry = node.y - hh;

                // Background
                ctx.beginPath();
                ctx.rect(rx, ry, badgeW, BADGE_H);
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fill();

                // Left color accent bar
                ctx.fillStyle = color;
                ctx.fillRect(rx, ry, 3, BADGE_H);

                // Border
                if (connectingNodeId === node.id) {
                    ctx.strokeStyle = '#3b82f6';
                    ctx.lineWidth = 2 / scale;
                } else {
                    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                    ctx.lineWidth = 1 / scale;
                }
                ctx.stroke();

                // Icon inside badge
                const iconX = rx + BADGE_PAD_LEFT + 3; // after accent bar
                const iconY = node.y - BADGE_ICON_SIZE / 2;
                if (hasIcon) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(imagesRef.current[node.icon!], iconX, iconY, BADGE_ICON_SIZE, BADGE_ICON_SIZE);
                }

                // Label inside badge — pixel-snapped for crisp text
                const labelX = rx + textStart;
                drawCrispText(displayText, labelX, node.y + 4, BADGE_FONT, 'rgba(255,255,255,0.85)', 'left');
            } else {
                // ── Compact square mode (was circle) ──
                const half = NODE_SIZE / 2;
                const rx = node.x - half;
                const ry = node.y - half;

                // Filled square
                ctx.beginPath();
                ctx.rect(rx, ry, NODE_SIZE, NODE_SIZE);
                ctx.fillStyle = color;
                ctx.fill();

                if (connectingNodeId === node.id) {
                    ctx.strokeStyle = '#3b82f6';
                    ctx.lineWidth = 3 / scale;
                } else {
                    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                    ctx.lineWidth = 1.5 / scale;
                }
                ctx.stroke();

                // Icon centered in square
                if (node.icon && imagesRef.current[node.icon]) {
                    const img = imagesRef.current[node.icon];
                    const iconSize = NODE_SIZE * 0.55;
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, node.x - iconSize / 2, node.y - iconSize / 2, iconSize, iconSize);
                }

                // Label below — truncate with ellipsis, pixel-snapped
                const labelFont = `400 ${12 / scale}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
                const maxLabelW = 90 / scale;
                let squareLabel = node.title;
                if (measureCrispText(squareLabel, labelFont) > maxLabelW) {
                    const ell = '\u2026';
                    const ew = measureCrispText(ell, labelFont);
                    while (squareLabel.length > 1 && measureCrispText(squareLabel, labelFont) + ew > maxLabelW) {
                        squareLabel = squareLabel.slice(0, -1);
                    }
                    squareLabel += ell;
                }
                drawCrispText(squareLabel, node.x, node.y + half + (14 / scale), labelFont, '#f5f5f5', 'center');
            }
        });
    }, [nodes, edges, scale, pan, connectingNodeId, mousePos, nodeShape]);

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
        const ro = new ResizeObserver(resize);
        ro.observe(container);
        window.addEventListener('resize', resize);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', resize);
        };
    }, [draw]);

    useEffect(() => { draw(); }, [draw, iconsLoaded]);

    // --- Mouse Handlers ---
    const getNodeAt = (x: number, y: number): GraphNode | undefined => {
        // x, y are world coords
        if (nodeShape === 'square') {
            // Hit-test using max possible badge width for reliable clicking
            return nodes.find((n: GraphNode) => {
                const hw = BADGE_MAX_W / 2;
                const hh = BADGE_H / 2;
                return x >= n.x - hw && x <= n.x + hw && y >= n.y - hh && y <= n.y + hh;
            });
        }
        // Compact square hit detection
        const half = NODE_SIZE / 2;
        return nodes.find((n: GraphNode) => Math.abs(n.x - x) <= half && Math.abs(n.y - y) <= half);
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
        const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));
        return edges.find((edge: GraphEdge) => {
            const from = nodeMap.get(edge.fromId);
            const to = nodeMap.get(edge.toId);
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
        // Close inline pickers
        if (colorPickerNodeId) { setColorPickerNodeId(null); return; }
        if (iconPickerNodeId) { setIconPickerNodeId(null); return; }

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
        // Capture event data synchronously before rAF deferral
        const clientX = e.clientX;
        const clientY = e.clientY;

        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const screenX = clientX - rect.left;
            const screenY = clientY - rect.top;

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
                const dx = clientX - dragStart.x;
                const dy = clientY - dragStart.y;

                // Update Pan
                setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
                setDragStart({ x: clientX, y: clientY });
            }
        });
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

    const wheelRafRef = useRef<number>(0);
    const handleWheel = (e: WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const clientX = e.clientX;
        const clientY = e.clientY;
        const deltaY = e.deltaY;

        cancelAnimationFrame(wheelRafRef.current);
        wheelRafRef.current = requestAnimationFrame(() => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            const screenX = clientX - rect.left;
            const screenY = clientY - rect.top;

            const worldX = (screenX - pan.x) / scale;
            const worldY = (screenY - pan.y) / scale;

            const zoomFactor = 1.1;
            const direction = deltaY < 0 ? 1 : -1;
            const nextScale = direction > 0 ? scale * zoomFactor : scale / zoomFactor;
            const clampedScale = clamp(nextScale, 0.2, 3);
            if (clampedScale === scale) return;

            const newPanX = screenX - worldX * clampedScale;
            const newPanY = screenY - worldY * clampedScale;

            setScale(clampedScale);
            setPan({ x: newPanX, y: newPanY });
        });
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

        const boundsWidth = maxX - minX + NODE_SIZE * 2;
        const boundsHeight = maxY - minY + NODE_SIZE * 2;
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

    // Listen for action triggers
    useEffect(() => {
        const handleTriggerAddNodeMenu = () => setIsAddMenuOpen(true);
        const handleTriggerCreateNode = (e: CustomEvent) => handleAddNode(e.detail?.type);

        window.addEventListener("trigger-graph-add-node-menu", handleTriggerAddNodeMenu);
        window.addEventListener("trigger-graph-create-node", handleTriggerCreateNode as EventListener);
        
        return () => {
            window.removeEventListener("trigger-graph-add-node-menu", handleTriggerAddNodeMenu);
            window.removeEventListener("trigger-graph-create-node", handleTriggerCreateNode as EventListener);
        };
    }, []);

    // --- Keybinds ---
    useKeybind("graph.newNode", () => {
        if (!nodeDialog.open && !isAddMenuOpen) {
            setIsAddMenuOpen(true);
        }
    }, { preventDefault: true, disableInInput: true });

    useKeybind("graph.center", () => {
        if (!nodeDialog.open && !isAddMenuOpen) {
            handleFitToView();
        }
    }, { preventDefault: !isAddMenuOpen, disableInInput: true });

    useKeybind("graph.zoomIn", () => setScale(s => Math.min(3, s * 1.2)), { preventDefault: true });
    useKeybind("graph.zoomOut", () => setScale(s => Math.max(0.2, s / 1.2)), { preventDefault: true });

    // Panning
    const PAN_STEP = 40;
    const FAST_PAN_STEP = 200;

    const isMenuFocused = () => {
        return !!document.activeElement?.closest('[role="menu"], [role="menuitem"], [data-radix-menu-content]');
    };

    useKeybind("graph.panUp", () => {
        if (!isAddMenuOpen && !isMenuFocused()) setPan(p => ({ ...p, y: p.y + 40 }));
    }, { preventDefault: !isAddMenuOpen });
    useKeybind("graph.panDown", () => {
        if (!isAddMenuOpen && !isMenuFocused()) setPan(p => ({ ...p, y: p.y - 40 }));
    }, { preventDefault: !isAddMenuOpen });
    useKeybind("graph.panLeft", () => {
        if (!isAddMenuOpen && !isMenuFocused()) setPan(p => ({ ...p, x: p.x + 40 }));
    }, { preventDefault: !isAddMenuOpen });
    useKeybind("graph.panRight", () => {
        if (!isAddMenuOpen && !isMenuFocused()) setPan(p => ({ ...p, x: p.x - 40 }));
    }, { preventDefault: !isAddMenuOpen });
    
    useKeybind("graph.panUpFast", () => {
        if (!isAddMenuOpen && !isMenuFocused()) setPan(p => ({ ...p, y: p.y + 200 }));
    }, { preventDefault: !isAddMenuOpen });
    useKeybind("graph.panDownFast", () => {
        if (!isAddMenuOpen && !isMenuFocused()) setPan(p => ({ ...p, y: p.y - 200 }));
    }, { preventDefault: !isAddMenuOpen });
    useKeybind("graph.panLeftFast", () => {
        if (!isAddMenuOpen && !isMenuFocused()) setPan(p => ({ ...p, x: p.x + 200 }));
    }, { preventDefault: !isAddMenuOpen });
    useKeybind("graph.panRightFast", () => {
        if (!isAddMenuOpen && !isMenuFocused()) setPan(p => ({ ...p, x: p.x - 200 }));
    }, { preventDefault: !isAddMenuOpen });

    useKeybind("graph.delete", () => {
        if (previewNodeId && !isAddMenuOpen) {
            useStore.setState((state: AppStore) => ({
                graphNodes: state.graphNodes.filter(n => n.id !== previewNodeId),
                graphEdges: state.graphEdges.filter(e => e.fromId !== previewNodeId && e.toId !== previewNodeId)
            }));
            setPreviewNodeId(null);
        }
    }, { preventDefault: !isAddMenuOpen });

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

    const handleAction = (action: 'edit' | 'delete' | 'connect' | 'changeColor' | 'changeIcon') => {
        if (!contextMenu) return;
        const { type, id } = contextMenu;
        setContextMenu(null);

        if (action === 'changeColor' && type === 'node') {
            setColorPickerNodeId(id);
            return;
        }

        if (action === 'changeIcon' && type === 'node') {
            setIconPickerNodeId(id);
            return;
        }

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
            <div ref={containerRef} className="flex-1 relative bg-transparent overflow-hidden">
                {activeGraph ? (
                    <>
                        {/* Toolbar */}
                        {/* Shape toggle – top-right */}
                        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm p-1 rounded-none border border-white/10 shadow-lg">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-7 w-7 rounded-none", nodeShape === 'circle' ? 'text-white bg-white/10' : 'text-muted-foreground hover:text-white hover:bg-white/10')}
                                onClick={() => setNodeShape('circle')}
                                title="Compact nodes"
                            >
                                <Square size={14} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-7 w-7 rounded-none", nodeShape === 'square' ? 'text-white bg-white/10' : 'text-muted-foreground hover:text-white hover:bg-white/10')}
                                onClick={() => setNodeShape('square')}
                                title="Badge nodes"
                            >
                                <NotePencil size={14} />
                            </Button>
                        </div>

                        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-none border border-white/10 shadow-lg">
                            <DropdownMenu open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 px-2 rounded-none text-muted-foreground hover:text-white hover:bg-white/10">
                                        <Plus className="mr-1.5" size={14} /> Add Node
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent 
                                    align="start" 
                                    className="w-[220px] p-2 bg-zinc-950 border-white/10 text-white"
                                    onKeyDown={(e: KeyboardEvent) => {
                                        if (e.key === 'Backspace') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsAddMenuOpen(false);
                                        }
                                        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(e.key)) {
                                            e.stopPropagation();
                                        }
                                    }}
                                >
                                    <div className="px-2 py-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Create Node</div>
                                    <div className="grid grid-cols-2 gap-1">
                                        {([
                                            { type: 'note' as const, label: 'Note', icon: Note, desc: 'Text note' },
                                            { type: 'file' as const, label: 'File', icon: File, desc: 'Media file' },
                                            { type: 'collection' as const, label: 'Collection', icon: Folder, desc: 'File group' },
                                            { type: 'highlight' as const, label: 'Highlight', icon: Clock, desc: 'Timestamp' },
                                            { type: 'doc' as const, label: 'Document', icon: NotePencil, desc: 'Rich text' },
                                            { type: 'link' as const, label: 'Link', icon: LinkIcon, desc: 'External URL' },
                                        ]).map(({ type: t, label, icon: Icon, desc }) => (
                                            <button
                                                key={t}
                                                onClick={() => { handleAddNode(t); setIsAddMenuOpen(false); }}
                                                className="flex flex-col items-center gap-1 p-2.5 rounded-none border border-transparent hover:bg-white/5 hover:border-white/10 transition-colors cursor-pointer text-center"
                                            >
                                                <Icon size={18} className="text-zinc-400" />
                                                <span className="text-[11px] font-medium text-zinc-200">{label}</span>
                                                <span className="text-[9px] text-zinc-500">{desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="w-px h-4 bg-white/10 mx-0.5" />

                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none text-muted-foreground hover:text-white hover:bg-white/10" onClick={() => setScale(s => Math.min(s + 0.1, 3))}>
                                <MagnifyingGlassPlus size={14} />
                            </Button>
                            <span className="text-[10px] text-zinc-500 w-8 text-center select-none font-mono">{Math.round(scale * 100)}%</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none text-muted-foreground hover:text-white hover:bg-white/10" onClick={() => setScale(s => Math.max(s - 0.1, 0.2))}>
                                <MagnifyingGlassMinus size={14} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-none text-muted-foreground hover:text-white hover:bg-white/10"
                                onClick={handleFitToView}
                                title="Fit to view"
                            >
                                <ArrowsOutSimple size={14} />
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
                                <ContextMenuContent className="min-w-[10rem]">
                                    {contextMenu.type === 'node' && (
                                        <>
                                            <ContextMenuItem onClick={() => handleAction('edit')} inset className="gap-2">
                                                <PencilSimple /> Edit node
                                            </ContextMenuItem>
                                            <ContextMenuItem onClick={() => handleAction('changeColor')} inset className="gap-2">
                                                <Palette /> Change color
                                            </ContextMenuItem>
                                            <ContextMenuItem onClick={() => handleAction('changeIcon')} inset className="gap-2">
                                                <Stamp /> Change icon
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

                        {/* Status Bar */}
                        <div className="absolute bottom-4 right-4 flex items-center gap-2 pointer-events-none select-none">
                            {activeGraph && (
                                <div className="px-2 py-1 rounded-none bg-zinc-950/80 border border-zinc-800 text-[10px] text-zinc-400 font-medium">
                                    {activeGraph.name}
                                </div>
                            )}
                            <div className="px-2 py-1 rounded-none bg-zinc-950/80 border border-zinc-800 text-[10px] text-zinc-400">
                                {nodes.length} nodes • {edges.length} edges
                            </div>
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
                                            top: screenY - NODE_SIZE / 2 - 10,
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

                        {/* Inline Color Picker */}
                        {colorPickerNodeId && (() => {
                            const node = nodes.find(n => n.id === colorPickerNodeId);
                            if (!node) return null;
                            const screenX = node.x * scale + pan.x;
                            const screenY = node.y * scale + pan.y;
                            return (
                                <div
                                    className="absolute z-50 bg-zinc-950 border border-zinc-800 rounded-none shadow-xl p-3"
                                    style={{ left: screenX, top: screenY + NODE_SIZE / 2 + 8, transform: 'translateX(-50%)' }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Node Color</div>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {PRESET_COLORS.map(c => (
                                            <button
                                                key={c}
                                                className={cn(
                                                    "w-6 h-6 rounded-none border-2 transition-all",
                                                    node.color === c ? "border-white scale-110" : "border-transparent hover:border-white/30 hover:scale-110"
                                                )}
                                                style={{ backgroundColor: c }}
                                                onClick={() => {
                                                    updateNode(node.id, { color: c });
                                                    setColorPickerNodeId(null);
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors w-full text-center"
                                        onClick={() => setColorPickerNodeId(null)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            );
                        })()}

                        {/* Inline Icon Picker */}
                        {iconPickerNodeId && (() => {
                            const node = nodes.find(n => n.id === iconPickerNodeId);
                            if (!node) return null;
                            const screenX = node.x * scale + pan.x;
                            const screenY = node.y * scale + pan.y;
                            return (
                                <div
                                    className="absolute z-50 bg-zinc-950 border border-zinc-800 rounded-none shadow-xl p-3"
                                    style={{ left: screenX, top: screenY + NODE_SIZE / 2 + 8, transform: 'translateX(-50%)' }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Node Icon</div>
                                    <div className="grid grid-cols-6 gap-1">
                                        {/* No icon option */}
                                        <button
                                            className={cn(
                                                "w-7 h-7 flex items-center justify-center rounded-none border transition-all",
                                                !node.icon ? "border-white bg-white/10 text-white" : "border-transparent text-zinc-500 hover:border-white/20 hover:text-white"
                                            )}
                                            onClick={() => {
                                                updateNode(node.id, { icon: "" });
                                                setIconPickerNodeId(null);
                                            }}
                                            title="No icon"
                                        >
                                            <span className="text-[9px] font-bold">Ø</span>
                                        </button>
                                        {iconNames.map(name => {
                                            const Icon = iconMap[name];
                                            return (
                                                <button
                                                    key={name}
                                                    className={cn(
                                                        "w-7 h-7 flex items-center justify-center rounded-none border transition-all",
                                                        node.icon === name ? "border-white bg-white/10 text-white" : "border-transparent text-zinc-500 hover:border-white/20 hover:text-white"
                                                    )}
                                                    onClick={() => {
                                                        updateNode(node.id, { icon: name });
                                                        setIconPickerNodeId(null);
                                                    }}
                                                    title={name}
                                                >
                                                    <Icon size={14} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors w-full text-center"
                                        onClick={() => setIconPickerNodeId(null)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            );
                        })()}
                    </>
                ) : !activeProjectId ? (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <Square size={64} weight="thin" className="mx-auto mb-4 opacity-30" />
                            <p>Select a project to create graphs</p>
                        </div>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <Square size={64} weight="thin" className="mx-auto mb-4 opacity-30" />
                            <p className="mb-4">Select or create a graph</p>
                            <Button variant="default" size="sm" className="rounded-none" onClick={handleCreateGraph}>
                                <Plus className="mr-2" /> Create Graph
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
