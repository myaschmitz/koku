/**
 * Offline queue backed by IndexedDB.
 *
 * Queues Supabase write operations when the network is unavailable and
 * replays them in order once the connection is restored.
 */

const DB_NAME = "koku-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-ops";

// ── Operation types ───────────────────────────────────────────────────

export type OfflineOp =
  | {
      type: "update-card";
      cardId: string;
      fields: Record<string, unknown>;
    }
  | {
      type: "insert-review-log";
      row: Record<string, unknown>;
    }
  | {
      type: "delete-review-log";
      logId: string;
    };

export interface QueuedOp {
  /** Auto-incremented by IndexedDB */
  id?: number;
  op: OfflineOp;
  createdAt: string;
}

// ── Open / migrate ────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Queue helpers ─────────────────────────────────────────────────────

export async function enqueue(op: OfflineOp): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.add({ op, createdAt: new Date().toISOString() } satisfies QueuedOp);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function peekAll(): Promise<QueuedOp[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      resolve(req.result);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function dequeue(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function pendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = () => {
      db.close();
      resolve(req.result);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

// ── Sync engine ───────────────────────────────────────────────────────

import { createClient } from "@/lib/supabase/client";

/**
 * Replays every queued operation against Supabase in FIFO order.
 * Returns the number of successfully synced operations.
 *
 * Card updates use a conflict guard: the update is only applied if the
 * card's `updated_at` hasn't moved past the time the offline operation was
 * created. This prevents a stale phone queue from overwriting fresher
 * edits made on another device (e.g. laptop) while the phone was offline.
 *
 * Review-log inserts are always safe (additive), so they have no guard.
 *
 * Operations that fail with a non-network error (e.g. RLS violation) are
 * discarded so they don't block the queue forever.
 */
export async function flushQueue(): Promise<number> {
  const ops = await peekAll();
  if (ops.length === 0) return 0;

  const supabase = createClient();
  let synced = 0;

  for (const queued of ops) {
    try {
      const { op } = queued;

      if (op.type === "update-card") {
        // Only apply if the card hasn't been updated by another device
        // since this offline operation was created.
        const { error } = await supabase
          .from("cards")
          .update(op.fields)
          .eq("id", op.cardId)
          .lte("updated_at", queued.createdAt);
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

      // Success (or no-op due to conflict guard) — remove from queue
      await dequeue(queued.id!);
      synced++;
    } catch (err: unknown) {
      // If we're offline again, stop trying
      if (!navigator.onLine) break;

      // For non-network errors (RLS, constraint, etc.), discard the op
      // so it doesn't block the queue permanently.
      console.error("[offline-queue] discarding failed op:", queued.op, err);
      await dequeue(queued.id!);
      synced++;
    }
  }

  return synced;
}
