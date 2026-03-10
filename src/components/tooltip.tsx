"use client";

import { useState, useRef, useEffect, useId } from "react";

interface TooltipProps {
  label: string;
  children: React.ReactNode;
}

export function Tooltip({ label, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("bottom");
  const ref = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (show && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // If too close to the bottom of the viewport, show above
      setPosition(rect.bottom + 40 > window.innerHeight ? "top" : "bottom");
    }
  }, [show]);

  return (
    <div
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
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
