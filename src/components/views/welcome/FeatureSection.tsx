/**
 * ─── FeatureSection.tsx ───────────────────────────────────────────────────────
 *
 * Reusable section component for WelcomeView feature showcase.
 *
 * Each FeatureSection displays:
 *   - A labeled header (icon + uppercase label + title + description)
 *   - Clickable "chip" buttons that toggle sub-feature detail views
 *   - A visual mockup area (aspect-[4/3]) that swaps between default and
 *     chip-specific mockups with AnimatePresence transitions
 *   - Optional `reversed` layout (text right, visual left)
 *
 * Props:
 *   - icon: Phosphor Icon component for the section label
 *   - label: Uppercase section label (e.g. "MEDIA PLAYBACK")
 *   - title: Section heading
 *   - description: Section body text
 *   - chips: Array of ChipDetail objects (label, title, desc, mockup)
 *   - defaultMockup: ReactNode shown when no chip is active
 *   - reversed: If true, swaps text/visual column order on desktop
 *   - id: HTML id attribute for scroll navigation (e.g. "section-media")
 *
 * Used by: WelcomeView.tsx (called 8 times, once per feature section)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Icon } from "@phosphor-icons/react";
import { fadeUp, stagger } from "./animations";

/** Shape of each chip's data (label, expanded title, description, mockup). */
export type ChipDetail = {
    label: string;
    title: string;
    desc: string;
    mockup: ReactNode;
};

export const FeatureSection = ({
    icon: SectionIcon,
    label,
    title,
    description,
    chips,
    defaultMockup,
    reversed = false,
    id,
}: {
    icon: Icon;
    label: string;
    title: string;
    description: string;
    chips: ChipDetail[];
    defaultMockup: ReactNode;
    reversed?: boolean;
    id?: string;
}) => {
    const [activeChip, setActiveChip] = useState<string | null>(null);
    const active = chips.find(c => c.label === activeChip) ?? null;

    return (
        <section className="px-6 pb-24 scroll-mt-16" id={id}>
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-60px" }}
                    variants={stagger}
                >
                    <motion.div variants={fadeUp} custom={0} className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-start`}>
                        {/* Text side */}
                        <div className={`space-y-4 ${reversed ? 'order-1 md:order-2' : ''}`}>
                            <div className="flex items-center gap-2 text-primary text-[11px] uppercase tracking-widest">
                                <SectionIcon weight="regular" size={14} />
                                <span>{label}</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-normal tracking-tight text-foreground">
                                {title}
                            </h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {description}
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {chips.map(c => (
                                    <button
                                        key={c.label}
                                        onClick={() => setActiveChip(prev => prev === c.label ? null : c.label)}
                                        className={`px-2 py-1 border text-[10px] transition-all cursor-pointer ${
                                            activeChip === c.label
                                                ? 'border-primary/50 bg-primary/10 text-primary'
                                                : 'border-border/30 bg-muted/20 text-muted-foreground/60 hover:border-border/50 hover:text-muted-foreground/80'
                                        }`}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Visual side */}
                        <motion.div variants={fadeUp} custom={1} className={reversed ? 'order-2 md:order-1' : ''}>
                            <div className="relative aspect-[4/3] overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {active ? (
                                        <motion.div
                                            key={active.label}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            transition={{ duration: 0.25 }}
                                            className="absolute inset-x-0 top-0 space-y-3"
                                        >
                                            <div className="space-y-1.5">
                                                <h3 className="text-sm font-medium text-foreground">{active.title}</h3>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{active.desc}</p>
                                            </div>
                                            {active.mockup}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="default"
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            transition={{ duration: 0.25 }}
                                            className="absolute inset-x-0 top-0"
                                        >
                                            {defaultMockup}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};
