/**
 * Motion primitives — the only place raw framer-motion variants live.
 * Keep springs/transitions consistent so the whole app moves as one product.
 */
import { motion, type HTMLMotionProps } from "framer-motion";

export const spring = { type: "spring", stiffness: 380, damping: 32, mass: 0.9 } as const;
export const softSpring = { type: "spring", stiffness: 240, damping: 28 } as const;

export function FadeIn({
  children,
  delay = 0,
  className,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...softSpring, delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerList({
  children,
  className,
  stagger = 0.05,
}: {
  children: React.ReactNode;
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
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: softSpring },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** iOS-style press feedback for tappable cards/buttons. */
export function ScalePress({
  children,
  className,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div whileTap={{ scale: 0.97 }} transition={spring} className={className} {...props}>
      {children}
    </motion.div>
  );
}
