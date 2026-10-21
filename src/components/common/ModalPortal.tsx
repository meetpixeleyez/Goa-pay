"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalPortalProps {
  children: ReactNode;
}

/**
 * ModalPortal safely mounts modal dialogs and backdrops directly to document.body.
 * This guarantees the backdrop overlay covers 100% of the viewport (including
 * sticky headers, sidebars, and overflow containers) without any CSS stacking
 * context conflicts.
 */
export default function ModalPortal({ children }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !children) return null;

  return createPortal(children, document.body);
}
