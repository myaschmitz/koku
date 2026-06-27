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

  it("copies a repeated local path only once and rewrites every occurrence", async () => {
    const { supabase, copy } = makeSupabase();
    const content =
      "![a](u/c/file.png) middle ![b](u/c/file.png)";
    const result = await duplicateCardImages(supabase, content, "u/new");

    // The source path is deduped before copying, so even though it appears
    // twice in the content it is copied exactly once, and both occurrences are
    // rewritten to the single new path.
    expect(copy).toHaveBeenCalledTimes(1);
    expect(copy).toHaveBeenCalledWith("u/c/file.png", "u/new/file.png");
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
