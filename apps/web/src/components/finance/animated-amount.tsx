"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { formatMoney } from "@stackzio/lib/money";

interface Props {
  /** Already-parsed numeric value. Decimal.toFixed → Number is fine for display only. */
  value: number;
  currency: string;
  className?: string;
  "data-testid"?: string;
}

export function AnimatedAmount({
  value,
  currency,
  className,
  "data-testid": dataTestid,
}: Props) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 22, stiffness: 240 });
  const display = useTransform(spring, (v) => formatMoney(v, currency as never));
  useEffect(() => {
    mv.set(value);
  }, [value, mv]);
  return (
    <motion.span className={className} data-testid={dataTestid}>
      {display}
    </motion.span>
  );
}
