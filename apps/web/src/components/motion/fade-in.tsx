"use client";

import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

export function FadeIn({
  children,
  delay = 0,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerList({
  children,
  className,
  stagger = 0.04,
}: {
  children: React.ReactNode[];
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger } },
      }}
    >
      {children.map((child, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, y: 6 },
            show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
