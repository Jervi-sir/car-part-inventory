import * as React from "react";
import { motion, Variants } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const; // luxury, smooth

// Child item variant (useful when you want staggered children)
export const revealItem: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: EASE },
  },
};

// Container that staggers its children using the above variant
export function Stagger({
  children,
  delay = 0,
  stagger = 0.08,
  amount = 0.2,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  stagger?: number;
  amount?: number; // how much of element must be in view (0..1)
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

// Simple one-shot reveal for whole blocks/sections
export function Reveal({
  children,
  delay = 0,
  duration = 0.6,
  amount = 0.2,
  y = 22,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  amount?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
