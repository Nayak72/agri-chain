"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.25, ease: "easeOut" },
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: "easeOut" },
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.2, ease: "easeOut" },
};

export function PageTransition({
  children,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      {...pageTransition}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  className,
}: { children: React.ReactNode; className?: string }) {
  const motionProps = {
    variants: staggerContainer,
    initial: "initial",
    animate: "animate",
  } as const;
  
  return (
    <motion.div
      {...motionProps}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  delay = 0,
}: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      variants={staggerItem}
      style={{ transitionDelay: `${delay}s` }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({
  children,
  className,
  delay = 0,
}: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SlideUp({
  children,
  className,
  delay = 0,
}: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({
  children,
  className,
  delay = 0,
}: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HoverScale({
  children,
  className,
  scale = 1.02,
}: { children: React.ReactNode; className?: string; scale?: number }) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HoverLift({
  children,
  className,
  y = -4,
}: { children: React.ReactNode; className?: string; y?: number }) {
  return (
    <motion.div
      whileHover={{ y, boxShadow: "0 20px 40px -10px rgba(23, 59, 47, 0.15)" }}
      whileTap={{ y: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}