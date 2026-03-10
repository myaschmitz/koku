"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  enqueue,
  flushQueue,
  pendingCount,
  type OfflineOp,
} from "@/lib/offline-queue";
import { createClient } from "@/lib/supabase/client";

/**
 * Provides offline-aware Supabase write helpers and sync status.
 *
 * - `exec(op)` tries the write immediately; on network failure it queues
 *   the operation to IndexedDB and resolves (never throws for network errors).
 * - Listens for `online` events and flushes the queue automatically.
 * - Exposes `pending` count and `isOnline` for UI indicators.
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pending, setPending] = useState(0);
  const flushingRef = useRef(false);

  // ── Network status listeners ──────────────────────────────────────

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ── Refresh pending count ─────────────────────────────────────────

  const refreshPending = useCallback(async () => {
    try {
      const count = await pendingCount();
      setPending(count);
    } catch {
      // IndexedDB may not be available in SSR
    }
  }, []);

  // Load initial count + request persistent storage so the browser
  // won't evict our IndexedDB queue even under storage pressure.
  useEffect(() => {
    refreshPending();
    if (navigator.storage?.persist) {
      navigator.storage.persist();
    }
  }, [refreshPending]);

  // ── Flush queue when coming back online ───────────────────────────

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    try {
      await flushQueue();
    } finally {
      flushingRef.current = false;
      await refreshPending();
    }
  }, [refreshPending]);

  useEffect(() => {
    if (isOnline) {
      flush();
    }
  }, [isOnline, flush]);

  // ── Execute a write (online-first, queue on failure) ──────────────

  const exec = useCallback(
    async (op: OfflineOp): Promise<void> => {
      const supabase = createClient();

      // If we already know we're offline, skip the network call entirely
      if (!navigator.onLine) {
        await enqueue(op);
        await refreshPending();
        return;
      }

      try {
        if (op.type === "update-card") {
          const { error } = await supabase
            .from("cards")
            .update(op.fields)
            .eq("id", op.cardId);
          if (error) throw error;
        } else if (op.type === "insert-review-log") {
          const { error } = await supabase
            .from("review_logs")
            .insert(op.row);
          if (error) throw error;
        } else if (op.type === "delete-review-log") {
          const { error } = await supabase
            .from("review_logs")
            .delete()
            .eq("id", op.logId);
          if (error) throw error;
        }
      } catch (err: unknown) {
        // Network-like errors → queue for later
        // Supabase client errors come as objects with `message`.
        // Real fetch failures are TypeError with "Failed to fetch" / "NetworkError".
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "message" in err
              ? String((err as { message: unknown }).message)
              : "";

        const isNetworkError =
          !navigator.onLine ||
          /fetch|network|timeout|abort/i.test(msg);

        if (isNetworkError) {
          await enqueue(op);
          await refreshPending();
        } else {
          // Non-network error (RLS, constraint) — rethrow so caller knows
          throw err;
        }
      }
    },
    [refreshPending],
  );

  return { exec, isOnline, pending, flush };
}
