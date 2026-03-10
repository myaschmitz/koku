"use client";

import { WifiOff, Loader2, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface OfflineIndicatorProps {
  isOnline: boolean;
  pending: number;
}

/**
 * Subtle banner that appears when:
 * - The device is offline (always shown)
 * - There are pending operations waiting to sync (shown briefly after coming
 *   back online, then auto-hides once the queue is empty)
 */
export function OfflineIndicator({ isOnline, pending }: OfflineIndicatorProps) {
  const [justSynced, setJustSynced] = useState(false);
  const prevPendingRef = useRef(pending);

  // Show a brief "synced" confirmation when pending drops to 0 after being > 0
  useEffect(() => {
    const hadPending = prevPendingRef.current > 0;
    prevPendingRef.current = pending;

    if (isOnline && pending === 0 && hadPending) {
      const t = setTimeout(() => setJustSynced(true), 0);
      const hide = setTimeout(() => setJustSynced(false), 2500);
      return () => {
        clearTimeout(t);
        clearTimeout(hide);
      };
    }
  }, [isOnline, pending]);

  if (isOnline && pending === 0 && !justSynced) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300"
      style={{
        background: !isOnline
          ? "var(--color-amber-100, #fef3c7)"
          : pending > 0
            ? "var(--color-blue-100, #dbeafe)"
            : "var(--color-green-100, #dcfce7)",
        color: !isOnline
          ? "var(--color-amber-800, #92400e)"
          : pending > 0
            ? "var(--color-blue-800, #1e40af)"
            : "var(--color-green-800, #166534)",
      }}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            Offline{pending > 0 ? ` · ${pending} review${pending === 1 ? "" : "s"} queued` : " · reviews will be saved locally"}
          </span>
        </>
      ) : pending > 0 ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          <span>Syncing {pending} review{pending === 1 ? "" : "s"}…</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>All reviews synced</span>
        </>
      )}
    </div>
  );
}
