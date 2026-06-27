// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Shared, hoisted mock state for the fake Supabase client.
const mockState = vi.hoisted(() => ({
  calls: [] as { table: string; method: string; args: unknown[] }[],
  result: { error: null } as { error: unknown },
}));

vi.mock("@/lib/supabase/client", () => {
  const makeBuilder = (table: string) => {
    const builder: Record<string, unknown> = {
      // Thenable so `await builder` (at whatever point the chain terminates)
      // resolves to the configurable result.
      then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
        return Promise.resolve(mockState.result).then(resolve, reject);
      },
    };
    for (const method of ["update", "insert", "delete", "eq", "lte"]) {
      builder[method] = (...args: unknown[]) => {
        mockState.calls.push({ table, method, args });
        return builder;
      };
    }
    return builder;
  };

  return {
    createClient: () => ({ from: (table: string) => makeBuilder(table) }),
  };
});

import {
  enqueue,
  peekAll,
  dequeue,
  pendingCount,
  flushQueue,
} from "../offline-queue";

function deleteDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase("koku-offline");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

beforeEach(async () => {
  await deleteDB();
  mockState.calls = [];
  mockState.result = { error: null };
  setOnline(true);
});

describe("enqueue / peekAll / pendingCount", () => {
  it("stores a queued op and reflects it in peekAll and pendingCount", async () => {
    await enqueue({ type: "delete-review-log", logId: "log-1" });

    const all = await peekAll();
    expect(all).toHaveLength(1);
    expect(all[0].op).toEqual({ type: "delete-review-log", logId: "log-1" });
    expect(typeof all[0].createdAt).toBe("string");
    expect(all[0].id).toBeDefined();

    expect(await pendingCount()).toBe(1);
  });
});

describe("dequeue", () => {
  it("removes a queued op by id", async () => {
    await enqueue({ type: "delete-review-log", logId: "log-1" });
    const all = await peekAll();
    await dequeue(all[0].id!);

    expect(await pendingCount()).toBe(0);
    expect(await peekAll()).toHaveLength(0);
  });
});

describe("flushQueue", () => {
  it("replays operations in FIFO order with the correct Supabase calls", async () => {
    await enqueue({
      type: "update-card",
      cardId: "card-1",
      fields: { content: "new" },
    });
    await enqueue({ type: "insert-review-log", row: { id: "rl-1", rating: 3 } });
    await enqueue({ type: "delete-review-log", logId: "log-9" });

    const queued = await peekAll();
    const updateCreatedAt = queued[0].createdAt;

    const synced = await flushQueue();

    expect(synced).toBe(3);
    expect(await pendingCount()).toBe(0);

    // FIFO order: update-card chain, then insert, then delete chain.
    expect(mockState.calls).toEqual([
      { table: "cards", method: "update", args: [{ content: "new" }] },
      { table: "cards", method: "eq", args: ["id", "card-1"] },
      { table: "cards", method: "lte", args: ["updated_at", updateCreatedAt] },
      { table: "review_logs", method: "insert", args: [{ id: "rl-1", rating: 3 }] },
      { table: "review_logs", method: "delete", args: [] },
      { table: "review_logs", method: "eq", args: ["id", "log-9"] },
    ]);
  });

  it("returns 0 and makes no calls when the queue is empty", async () => {
    const synced = await flushQueue();
    expect(synced).toBe(0);
    expect(mockState.calls).toHaveLength(0);
  });

  it("discards (and counts) an op that fails with a non-network error while online", async () => {
    await enqueue({
      type: "update-card",
      cardId: "card-1",
      fields: { content: "x" },
    });
    mockState.result = { error: { message: "RLS violation" } };
    setOnline(true);

    const synced = await flushQueue();

    expect(synced).toBe(1);
    expect(await pendingCount()).toBe(0);
  });

  it("stops early and keeps ops queued when offline at the time of a failure", async () => {
    await enqueue({
      type: "update-card",
      cardId: "card-1",
      fields: { content: "x" },
    });
    await enqueue({ type: "delete-review-log", logId: "log-2" });
    mockState.result = { error: { message: "network down" } };
    setOnline(false);

    const synced = await flushQueue();

    expect(synced).toBe(0);
    expect(await pendingCount()).toBe(2);
  });
});
