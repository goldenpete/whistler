/**
 * ─── animations.ts ────────────────────────────────────────────────────────────
 *
 * Shared Framer Motion animation variants used by the WelcomeView landing page.
 *
 * Exports:
 *   - fadeUp: Fade-in + slide-up animation (accepts custom delay via `custom` prop)
 *   - stagger: Parent variant that staggers children animations
 *
 * Usage:
 *   <motion.div variants={fadeUp} custom={0}> ... </motion.div>
 *   <motion.div variants={stagger}> {children with fadeUp} </motion.div>
 *
 * Used by: WelcomeView.tsx, FeatureSection.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.07, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
    }),
};

export const stagger = {
    visible: { transition: { staggerChildren: 0.05 } },
};
