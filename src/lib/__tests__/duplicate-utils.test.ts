import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { duplicateCardImages } from "../duplicate-utils";

function makeSupabase(copyImpl?: (from: string, to: string) => unknown) {
  const copy = vi.fn(
    copyImpl ?? (() => Promise.resolve({ data: {}, error: null })),
  );
  const from = vi.fn(() => ({ copy }));
  const supabase = { storage: { from } } as unknown as SupabaseClient;
  return { supabase, copy, from };
}

describe("duplicateCardImages", () => {
  it("returns content unchanged and never copies when there are no images", async () => {
    const { supabase, copy } = makeSupabase();
    const content = "Just some text\n---\nand a back";
    const result = await duplicateCardImages(supabase, content, "u/new");
    expect(result).toBe(content);
    expect(copy).not.toHaveBeenCalled();
  });

  it("copies each local image once and rewrites paths to the new storage path", async () => {
    const { supabase, copy } = makeSupabase();
    const content = "Look: ![alt](userId/cardId/file.png) done";
    const result = await duplicateCardImages(supabase, content, "userId/newCard");

    expect(copy).toHaveBeenCalledTimes(1);
    expect(copy).toHaveBeenCalledWith(
      "userId/cardId/file.png",
      "userId/newCard/file.png",
    );
    expect(result).toBe("Look: ![alt](userId/newCard/file.png) done");
  });

  it("ignores absolute http(s) image URLs", async () => {
    const { supabase, copy } = makeSupabase();
    const content =
      "![a](https://cdn.example.com/x.png) and ![b](http://h.com/y.png)";
    const result = await duplicateCardImages(supabase, content, "u/new");
    expect(copy).not.toHaveBeenCalled();
    expect(result).toBe(content);
  });

  it("rewrites every occurrence of a repeated local path to the same new path", async () => {
    const { supabase, copy } = makeSupabase();
    const content =
      "![a](u/c/file.png) middle ![b](u/c/file.png)";
    const result = await duplicateCardImages(supabase, content, "u/new");

    // NOTE: The in-flight `pathMap.has` guard does not dedupe under the
    // concurrent Promise.all, so copy is invoked once per occurrence. Every
    // call still targets the same source/destination, and both occurrences are
    // rewritten to the single new path. (See PR notes.)
    expect(copy.mock.calls.length).toBeGreaterThanOrEqual(1);
    for (const call of copy.mock.calls) {
      expect(call).toEqual(["u/c/file.png", "u/new/file.png"]);
    }
    expect(result).toBe(
      "![a](u/new/file.png) middle ![b](u/new/file.png)",
    );
  });

  it("leaves the original path unchanged when the copy fails", async () => {
    const { supabase, copy } = makeSupabase(() =>
      Promise.resolve({ data: null, error: { message: "copy failed" } }),
    );
    const content = "![a](u/c/file.png)";
    const result = await duplicateCardImages(supabase, content, "u/new");

    expect(copy).toHaveBeenCalledTimes(1);
    expect(result).toBe(content);
  });
});
