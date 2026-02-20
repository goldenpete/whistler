/**
 * ─── GraphWebBackground.tsx ───────────────────────────────────────────────────
 *
 * Animated canvas background for the WelcomeView hero section.
 * Renders drifting nodes connected by semi-transparent lines.
 *
 * How it works:
 *   1. On mount, spawns 60 nodes at random positions with random velocities
 *   2. Each animation frame: moves nodes, bounces off edges, draws connecting
 *      lines between nodes within 180px, and draws node circles
 *   3. Colors are derived from the CSS --primary HSL variable (parsed to RGB)
 *   4. On window resize, node positions are rescaled proportionally
 *
 * Customization:
 *   - NODE_COUNT: number of floating dots (default: 60)
 *   - CONNECT_DIST: max distance for edge lines (default: 180)
 *   - Edge opacity: 0.12 max, Node opacity: 0.22
 *
 * Used by: WelcomeView.tsx (inside the hero <section>)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useEffect, useCallback } from "react";

interface WebNode {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
}

const CONNECT_DIST = 180;
const NODE_COUNT = 60;

export const GraphWebBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nodesRef = useRef<WebNode[]>([]);
    const animRef = useRef<number>(0);
    const dprRef = useRef(1);

    const init = useCallback((w: number, h: number) => {
        const nodes: WebNode[] = [];
        for (let i = 0; i < NODE_COUNT; i++) {
            nodes.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 2 + 1.2,
            });
        }
        nodesRef.current = nodes;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const prevSize = { w: 0, h: 0 };

        const resize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            const dpr = window.devicePixelRatio || 1;
            dprRef.current = dpr;
            const w = parent.clientWidth;
            const h = parent.clientHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            if (nodesRef.current.length === 0) {
                init(w, h);
            } else if (prevSize.w > 0 && prevSize.h > 0) {
                // Rescale node positions proportionally to new size
                const sx = w / prevSize.w;
                const sy = h / prevSize.h;
                for (const n of nodesRef.current) {
                    n.x *= sx;
                    n.y *= sy;
                }
            }
            prevSize.w = w;
            prevSize.h = h;
        };
        resize();
        window.addEventListener("resize", resize);

        const tick = () => {
            const dpr = dprRef.current;
            const w = canvas.width / dpr;
            const h = canvas.height / dpr;
            const nodes = nodesRef.current;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);

            // Resolve primary color to rgb for canvas use
            const primary = getComputedStyle(canvas).getPropertyValue("--primary").trim();
            // Parse HSL string like "142 71% 45%" into usable rgb
            let r = 255, g = 255, b = 255;
            if (primary) {
                const parts = primary.split(/\s+/);
                if (parts.length >= 3) {
                    const hVal = parseFloat(parts[0]) / 360;
                    const s = parseFloat(parts[1]) / 100;
                    const l = parseFloat(parts[2]) / 100;
                    const hue2rgb = (p: number, q: number, t: number) => {
                        if (t < 0) t += 1;
                        if (t > 1) t -= 1;
                        if (t < 1 / 6) return p + (q - p) * 6 * t;
                        if (t < 1 / 2) return q;
                        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                        return p;
                    };
                    if (s === 0) {
                        r = g = b = Math.round(l * 255);
                    } else {
                        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                        const p = 2 * l - q;
                        r = Math.round(hue2rgb(p, q, hVal + 1 / 3) * 255);
                        g = Math.round(hue2rgb(p, q, hVal) * 255);
                        b = Math.round(hue2rgb(p, q, hVal - 1 / 3) * 255);
                    }
                }
            }

            // Move nodes
            for (const n of nodes) {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0 || n.x > w) n.vx *= -1;
                if (n.y < 0 || n.y > h) n.vy *= -1;
                n.x = Math.max(0, Math.min(w, n.x));
                n.y = Math.max(0, Math.min(h, n.y));
            }

            // Draw edges
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECT_DIST) {
                        const alpha = (1 - dist / CONNECT_DIST) * 0.12;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            // Draw nodes
            for (const n of nodes) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${r},${g},${b},0.22)`;
                ctx.fill();
            }

            animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener("resize", resize);
        };
    }, [init]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden
        />
    );
};
