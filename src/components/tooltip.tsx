"use client";

import { useState, useRef, useEffect, useId } from "react";

interface TooltipProps {
  label: string;
  children: React.ReactNode;
  delay?: number;
}

export function Tooltip({ label, children, delay = 1000 }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("bottom");
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (show && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // If too close to the bottom of the viewport, show above
      setPosition(rect.bottom + 40 > window.innerHeight ? "top" : "bottom");
    }
  }, [show]);

  function handleMouseEnter() {
    timerRef.current = setTimeout(() => setShow(true), delay);
  }

  function handleMouseLeave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShow(false);
  }

  return (
    <div
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={() => setShow(true)}
      onBlur={handleMouseLeave}
      aria-describedby={show ? tooltipId : undefined}
    >
      {children}
      {show && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md bg-slate-900 dark:bg-slate-100 px-2 py-1 text-xs text-white dark:text-slate-900 shadow-sm pointer-events-none ${
            position === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5"
          }`}
        >
          {label}
        </div>
      )}
    </div>
  );
}
